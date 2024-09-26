import mongoose from 'mongoose'
const movieSchema = new mongoose.Schema({
    id: {
        type: Number,
        required:true,
    },
    name: {
        type: String,
        required: true,
    },
    time: {
        type: Number,
        required: true,
    },
    year: {
        type: Number,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
    introduce: {
        type: String,
        required: true,
    }
})
const MovieModel = mongoose.model('movie',movieSchema)
export default MovieModel