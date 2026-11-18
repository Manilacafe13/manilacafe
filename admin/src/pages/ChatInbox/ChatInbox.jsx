
import React, {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'

import './ChatInbox.css'

// ======================================================
// MANILA CAFÉ LIVECHAT V1.3
// Admin inbox + customer notification sound
// ======================================================

const POLL_MS = 8000
const CHAT_SOUND = '/sounds/chat-pling.wav'

const reasonLabels = {
  delivery_cost: 'Leveranskostnad',
  product_info: 'Produktinformation',
  price: 'Pris',
  payment: 'Betalning',
  just_browsing: 'Tittade bara',
  other: 'Annat'
}

const statusLabels = {
  bot: 'Automatiska svar',
  needs_staff: 'Väntar på personal',
  staff: 'Personal hanterar',
  closed: 'Avslutad'
}

const formatDate = (value) => {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString('sv-SE', {
    dateStyle: 'short',
    timeStyle: 'short'
  })
}

// ======================================================
// CHAT INBOX
// ======================================================

export default function ChatInbox({
  apiBase = '',
  authenticatedFetch
}) {

  const [conversations, setConversations] =
    useState([])

  const [selected, setSelected] =
    useState(null)

  const [insights, setInsights] =
    useState(null)

  const [input, setInput] =
    useState('')

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState('')

  const [loading, setLoading] =
    useState(true)

  const [sending, setSending] =
    useState(false)

  const [updating, setUpdating] =
    useState(false)

  const [soundEnabled, setSoundEnabled] =
    useState(false)

  const [soundError, setSoundError] =
    useState('')

  const threadRef = useRef(null)
  const audioRef = useRef(null)

  const soundEnabledRef = useRef(false)

  // Previously observed customer messages.
  const knownMessagesRef = useRef(new Set())

  // Prevent sound on first load.
  const initializedRef = useRef(false)

  // Prevent overlapping polling requests.
  const fetchingRef = useRef(false)

  const mountedRef = useRef(false)

  // ====================================================
  // API REQUESTS
  // ====================================================

  const api = useCallback(
    async (path, options = {}) => {

      if (
        typeof authenticatedFetch !== 'function'
      ) {
        throw new Error(
          'Admininloggning måste kopplas in.'
        )
      }

      const response = await authenticatedFetch(
        apiBase.replace(/\/+$/, '') +
          '/api/chat/staff' +
          path,
        options
      )

      const data = await response
        .json()
        .catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data.error ||
          data.message ||
          'Något gick fel.'
        )
      }

      return data
    },
    [apiBase, authenticatedFetch]
  )

  // ====================================================
  // PLAY CHAT NOTIFICATION
  // ====================================================

  const playChatSound = useCallback(async () => {

    if (!soundEnabledRef.current) return

    try {

      if (!audioRef.current) {
        audioRef.current =
          new Audio(CHAT_SOUND)

        audioRef.current.volume = 0.65
      }

      const audio = audioRef.current

      audio.pause()
      audio.currentTime = 0

      await audio.play()

    } catch (err) {

      console.warn(
        'Chat notification sound failed:',
        err
      )

      if (mountedRef.current) {
        setSoundError(
          'Ljudet kunde inte spelas. Kontrollera ljudbehörigheten.'
        )
      }

    }

  }, [])

  // ====================================================
  // ACTIVATE / DEACTIVATE SOUND
  // ====================================================

  const toggleChatSound = async () => {

    setSoundError('')

    if (soundEnabledRef.current) {

      soundEnabledRef.current = false
      setSoundEnabled(false)

      if (audioRef.current) {
        audioRef.current.pause()
      }

      return
    }

    try {

      if (!audioRef.current) {
        audioRef.current =
          new Audio(CHAT_SOUND)
      }

      const audio = audioRef.current

      audio.volume = 0.65
      audio.currentTime = 0

      // User click unlocks browser audio.
      await audio.play()

      soundEnabledRef.current = true
      setSoundEnabled(true)

    } catch (err) {

      console.error(
        'Could not activate chat sound:',
        err
      )

      soundEnabledRef.current = false
      setSoundEnabled(false)

      setSoundError(
        'Kunde inte aktivera chattljudet. Kontrollera att /sounds/chat-pling.wav finns.'
      )

    }

  }

  // ====================================================
  // DETECT NEW CUSTOMER MESSAGES
  // ====================================================

  const checkNewMessages = useCallback(
    (items) => {

      const currentMessages = new Set()
      let newCustomerMessages = 0

      for (const conversation of items) {

        const messages =
          conversation.messages || []

        messages.forEach((message, index) => {

          if (message.role !== 'customer') {
            return
          }

          const key =
            `${conversation._id}:` +
            String(message._id || index)

          currentMessages.add(key)

          if (
            initializedRef.current &&
            !knownMessagesRef.current.has(key)
          ) {
            newCustomerMessages += 1
          }

        })

      }

      // Save current state after checking.
      knownMessagesRef.current =
        currentMessages

      if (!initializedRef.current) {

        initializedRef.current = true
        return

      }

      if (newCustomerMessages > 0) {

        // Only one pling per polling cycle,
        // even if several messages arrive.
        void playChatSound()

      }

    },
    [playChatSound]
  )

  // ====================================================
  // REFRESH INBOX
  // ====================================================

  const refresh = useCallback(async () => {

    if (fetchingRef.current) return

    fetchingRef.current = true

    try {

      const [items, stats] =
        await Promise.all([
          api('/conversations'),
          api('/insights')
        ])

      if (!mountedRef.current) return

      const validItems =
        Array.isArray(items) ? items : []

      checkNewMessages(validItems)

      setConversations(validItems)
      setInsights(stats)
      setError('')

    } catch (err) {

      if (mountedRef.current) {
        setError(err.message)
      }

    } finally {

      fetchingRef.current = false

      if (mountedRef.current) {
        setLoading(false)
      }

    }

  }, [api, checkNewMessages])

  // ====================================================
  // AUTOMATIC POLLING
  // ====================================================

  useEffect(() => {

    mountedRef.current = true

    void refresh()

    const interval = window.setInterval(
      () => void refresh(),
      POLL_MS
    )

    return () => {

      mountedRef.current = false

      window.clearInterval(interval)

      if (audioRef.current) {
        audioRef.current.pause()
      }

    }

  }, [refresh])

  // ====================================================
  // CURRENT CONVERSATION
  // ====================================================

  const current =
    conversations.find(
      chat => chat._id === selected
    ) || (
      selected === null
        ? conversations[0]
        : null
    )

  const currentId = current?._id

  const messageCount =
    current?.messages?.length || 0

  // ====================================================
  // AUTO SCROLL
  // ====================================================

  useEffect(() => {

    if (threadRef.current) {

      threadRef.current.scrollTop =
        threadRef.current.scrollHeight

    }

  }, [currentId, messageCount])

  // ====================================================
  // STAFF REPLY
  // ====================================================

  const reply = async (event) => {

    event.preventDefault()

    if (
      !current ||
      !input.trim() ||
      sending
    ) {
      return
    }

    setSending(true)
    setError('')
    setSuccess('')

    try {

      await api(
        `/conversations/${current._id}/reply`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body: JSON.stringify({
            text: input.trim()
          })
        }
      )

      setInput('')
      setSuccess('Meddelandet skickades.')

      await refresh()

    } catch (err) {

      setError(err.message)

    } finally {

      setSending(false)

    }

  }

  // ====================================================
  // UPDATE STATUS
  // ====================================================

  const updateStatus = async (status) => {

    if (!current || updating) return

    setUpdating(true)
    setError('')
    setSuccess('')

    try {

      await api(
        `/conversations/${current._id}`,
        {
          method: 'PATCH',

          headers: {
            'Content-Type':
              'application/json'
          },

          body: JSON.stringify({
            status
          })
        }
      )

      setSuccess(
        `Status ändrad till: ${statusLabels[status]}`
      )

      await refresh()

    } catch (err) {

      setError(err.message)

    } finally {

      setUpdating(false)

    }

  }

  // ====================================================
  // STATISTICS
  // ====================================================

  const feedbackCount = Object.values(
    insights?.reasons || {}
  ).reduce(
    (total, count) => total + count,
    0
  )

  // ====================================================
  // RENDER
  // ====================================================

  return (

    <main className="manila-inbox">

      {/* HEADER */}

      <div className="manila-inbox-header">

        <div>
          <h2>💜 Livechatt & Kundinsikter</h2>

          <p>
            Hantera kundmeddelanden och
            förstå varför kunder tvekar inför köp.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10
          }}
        >

          {/* SOUND BUTTON */}

          <button
            type="button"
            className="manila-refresh-btn"
            onClick={toggleChatSound}
            aria-pressed={soundEnabled}
          >
            {soundEnabled
              ? '🔊 Chattljud på'
              : '🔔 Aktivera chattljud'}
          </button>

          {/* REFRESH */}

          <button
            type="button"
            className="manila-refresh-btn"
            onClick={() => void refresh()}
          >
            ↻ Uppdatera
          </button>

        </div>

      </div>

      {/* SOUND INFO */}

      {soundEnabled && (

        <p
          style={{
            fontSize: 12,
            color: '#76549e',
            marginBottom: 15
          }}
        >
          🔊 Chattljud är aktiverat.
          Ett pling spelas när nya
          kundmeddelanden upptäcks.
        </p>

      )}

      {soundError && (
        <div
          className="manila-inbox-error"
          role="alert"
        >
          {soundError}
        </div>
      )}

      {error && (
        <div
          className="manila-inbox-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="manila-inbox-success"
          role="status"
        >
          {success}
        </div>
      )}

      {/* METRICS */}

      <div className="manila-inbox-metrics">

        <div>
          <strong>
            {insights?.conversations ?? '—'}
          </strong>
          <span>Konversationer</span>
        </div>

        <div>
          <strong>
            {insights?.needsStaff ?? '—'}
          </strong>
          <span>Väntar på personal</span>
        </div>

        <div>
          <strong>{feedbackCount}</strong>
          <span>Feedbacksvar</span>
        </div>

      </div>

      {/* MAIN INBOX */}

      <div className="manila-inbox-grid">

        <aside>

          <h3>Inkorg</h3>

          {loading && (
            <p>Laddar konversationer...</p>
          )}

          {!loading &&
            conversations.length === 0 && (
              <p>Inga konversationer ännu.</p>
            )}

          {conversations.map(chat => (

            <button
              key={chat._id}
              type="button"
              className={
                current?._id === chat._id
                  ? 'active'
                  : ''
              }
              onClick={() => {

                setSelected(chat._id)
                setInput('')
                setSuccess('')

              }}
            >

              <b>
                {chat.status === 'needs_staff'
                  ? '🔴 Kräver svar'
                  : chat.status === 'staff'
                    ? '🟢 Personal'
                    : chat.status === 'closed'
                      ? '⚪ Avslutad'
                      : '💬 Automatisk'}
              </b>

              <small>
                {(chat.messages || [])
                  .at(-1)
                  ?.text
                  ?.slice(0, 85) || 'Ny chatt'}
              </small>

              <small>
                {formatDate(chat.lastMessageAt)}
              </small>

            </button>

          ))}

        </aside>

        {/* CONVERSATION */}

        <section>

          {!current ? (

            <h3>Välj en konversation</h3>

          ) : (

            <>

              <div className="manila-chat-title">

                <h3>Konversation</h3>

                <span
                  className={
                    'manila-status manila-status-' +
                    current.status
                  }
                >
                  {statusLabels[current.status]}
                </span>

              </div>

              {/* ACTIONS */}

              <div className="manila-chat-actions">

                {current.status !== 'staff' && (

                  <button
                    type="button"
                    disabled={updating}
                    onClick={() =>
                      updateStatus('staff')
                    }
                  >
                    👩‍💻 Ta över chatten
                  </button>

                )}

                {current.status !== 'bot' && (

                  <button
                    type="button"
                    disabled={updating}
                    onClick={() =>
                      updateStatus('bot')
                    }
                  >
                    🤖 Automatiska svar
                  </button>

                )}

                {current.status !== 'closed' && (

                  <button
                    type="button"
                    disabled={updating}
                    onClick={() =>
                      updateStatus('closed')
                    }
                  >
                    ✓ Avsluta
                  </button>

                )}

              </div>

              {/* MESSAGES */}

              <div
                className="manila-inbox-thread"
                ref={threadRef}
                aria-live="polite"
              >

                {(current.messages || []).map(
                  (message, index) => (

                    <p
                      key={message._id || index}
                      className={
                        message.role === 'customer'
                          ? 'customer'
                          : 'staff'
                      }
                    >

                      <small>
                        {message.role === 'customer'
                          ? 'Kund'
                          : message.role === 'bot'
                            ? 'Automatiskt svar'
                            : 'Personal'}
                      </small>

                      {message.text}

                    </p>

                  )
                )}

              </div>

              {/* REPLY */}

              <form onSubmit={reply}>

                <input
                  aria-label="Svar till kund"
                  value={input}
                  onChange={event =>
                    setInput(event.target.value)
                  }
                  placeholder="Skriv ett svar till kunden..."
                  maxLength={1000}
                  disabled={sending}
                />

                <button
                  type="submit"
                  disabled={
                    sending ||
                    !input.trim()
                  }
                >
                  {sending
                    ? 'Skickar...'
                    : 'Skicka'}
                </button>

              </form>

            </>

          )}

        </section>

      </div>

      {/* CUSTOMER INSIGHTS */}

      <h3>
        Varför kunder tvekar
        (frivilliga svar)
      </h3>

      <div className="manila-inbox-reasons">

        {Object.entries(
          insights?.reasons || {}
        ).map(([reason, count]) => (

          <div key={reason}>

            <span>
              {reasonLabels[reason] || reason}
            </span>

            <strong>{count}</strong>

          </div>

        ))}

      </div>

    </main>

  )

}
