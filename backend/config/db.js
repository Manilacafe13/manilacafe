import mongoose from "mongoose"

 export const connectedDB =async() => {
    await mongoose.connect('mongodb+srv://ManilaCafe:Dtrlm2wA9yYwlWnQ@cluster0.xso8qsl.mongodb.net/?appName=ManilaCafe').then(()=>console.log("DB Connected"));
}