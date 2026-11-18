
import React, {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'

import './ChatInbox.css'

// ======================================================
// MANILA CAFÉ LIVECHAT - ADMIN INBOX
// ======================================================

const API_REFRESH_INTERVAL = 8000

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

export default function ChatInbox({
  apiBase = '',
  authenticatedFetch
}) {

  const [conversations, setConversations] = useState([])
  const [selected, setSelected] = useState(null)
  const [insights, setInsights] = useState(null)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [updating, setUpdating] = useState(false)

  const threadRef = useRef(null)

  // ====================================================
  // API
  // ====================================================

  const api = useCallback(
    async (path, options = {}) => {

      if (typeof authenticatedFetch !== 'function') {
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
  // LOAD CONVERSATIONS AND INSIGHTS
  // ====================================================

  const refresh = useCallback(async () => {

    try {

      const [items, stats] = await Promise.all([
        api('/conversations'),
        api('/insights')
      ])

      setConversations(items)
      setInsights(stats)
      setError('')

    } catch (err) {

      setError(err.message)

    } finally {

      setLoading(false)

    }

  }, [api])

  // ====================================================
  // AUTO REFRESH
  // ====================================================

  useEffect(() => {

    refresh()

    const interval = setInterval(
      refresh,
      API_REFRESH_INTERVAL
    )

    return () => clearInterval(interval)

  }, [refresh])

  // ====================================================
  // SELECTED CONVERSATION
  // ====================================================

  const current =
    conversations.find(
      chat => chat._id === selected
    ) || (
      selected === null
        ? conversations[0]
        : null
    )

  // ====================================================
  // AUTO SCROLL MESSAGES
  // ====================================================

  const currentId = current?._id
  const messageCount = current?.messages?.length || 0

  useEffect(() => {

    if (threadRef.current) {
      threadRef.current.scrollTop =
        threadRef.current.scrollHeight
    }

  }, [currentId, messageCount])

  // ====================================================
  // SEND STAFF MESSAGE
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
            'Content-Type': 'application/json'
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
  // UPDATE CONVERSATION STATUS
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
            'Content-Type': 'application/json'
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
  // CALCULATE METRICS
  // ====================================================

  const feedbackCount = Object.values(
    insights?.reasons || {}
  ).reduce(
    (total, count) => total + count,
    0
  )

  // ====================================================
  // FORMAT DATE
  // ====================================================

  const formatDate = (date) => {

    if (!date) return ''

    return new Date(date).toLocaleString(
      'sv-SE',
      {
        dateStyle: 'short',
        timeStyle: 'short'
      }
    )

  }

  // ====================================================
  // RENDER
  // ====================================================

  return (

    <main className="manila-inbox">

      <div className="manila-inbox-header">

        <div>
          <h2>💜 Livechatt & Kundinsikter</h2>
          <p>
            Hantera kundmeddelanden och förstå
            varför kunder tvekar inför köp.
          </p>
        </div>

        <button
          type="button"
          onClick={refresh}
          className="manila-refresh-btn"
        >
          ↻ Uppdatera
        </button>

      </div>

      {/* NOTIFICATIONS */}

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
          <strong>
            {feedbackCount}
          </strong>
          <span>Feedbacksvar</span>
        </div>

      </div>

      {/* MAIN GRID */}

      <div className="manila-inbox-grid">

        {/* CONVERSATION LIST */}

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

        {/* SELECTED CONVERSATION */}

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

              {/* STATUS ACTIONS */}

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

              {/* MESSAGE THREAD */}

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

              {/* STAFF REPLY */}

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

            <strong>
              {count}
            </strong>

          </div>

        ))}

      </div>

    </main>

  )

}
