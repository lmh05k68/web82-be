import mongoose from 'mongoose'
const userSchema = new mongoose.Schema({
    userName:String,
    email:{
        type:String,
        unique:true,
        required:true
    },
    role:{
        type:String,
        default:'user'
    },
    password:{
        type:String,
        required:true
    }
})
const UserModel = mongoose.model('user',userSchema)
export default UserModel