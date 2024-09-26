import express from 'express'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import UserModel from './model/user.js'
import jwt from 'jsonwebtoken';
import {Data} from './data.js'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary';
import MovieModel from './model/movie.js'
import path from 'path';
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
dotenv.config();
await mongoose.connect(process.env.MONGODB_URL);
const app = express();
app.use(express.json()); 

let blacklistedTokens = [];
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(403).send('Token không tồn tại');
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(403).send('Token không tồn tại');
    if (blacklistedTokens.includes(token)) {
        return res.status(403).send('Token đã bị vô hiệu hóa');
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).send('Token không hợp lệ');
        req.user = user;
        next();
    });
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      cb(null, 'uploads/'); 
  },
  filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname)); 
  }
});
const upload = multer({ storage: storage });
//đăng kí
app.post('/register',async (req,res)=>{
    try{
        const {email,password,userName} = req.body;
        if (!password || !email || !userName) throw new Error("Bạn chưa cung cấp thông tin");
        const existingUser = await UserModel.findOne({ email });
        if (existingUser) {
            return res.status(409).send({ message: "Email đã tồn tại", data: null });
        }
        const createdUser = await UserModel.create({
            password,
            email,
            userName
    });
        res.status(201).send({
            message:'Đăng kí thành công',
            data:createdUser
          });
    }catch(error){
        res.status(403).send({
            message: error.message,
            data:null
        })
    }
})
//đăng nhập
app.post('/login',async (req,res)=>{
    try{
        const {email,password} = req.body;
        if (!password || !email) throw new Error("Bạn chưa cung cấp thông tin");
        const currentUser = await UserModel.findOne({email:email});
        if(!currentUser) throw new Error("Sai tài khoản hoặc mật khẩu");
        if(currentUser.password != password) throw new Error("Sai tài khoản hoặc mật khẩu");
        const token = jwt.sign(
            { id: currentUser._id, email: currentUser.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        res.status(200).send({
            message:'Thành công!',
            data:currentUser,
            token:token 
        });
    } catch(error){
        res.status(403).send({
            message: error.message,
            data:null
        })
    }
})
//đăng xuất
app.post('/logout', verifyToken, (req, res) => {
    const token = req.headers['authorization'].split('')[1];
    blacklistedTokens.push(token);

    res.status(200).send({
        message: 'Đăng xuất thành công!'
    });
});
//api danh sách
app.get('/movies',(req,res)=>{
    res.status(200).send({
        message:'Danh sách phim',
        data:Data
    })
})
//api thêm
app.post('/movies', async (req, res) => {
  const { id, name, time, year, image, introduce } = req.body;
  try {
      const newMovie = new MovieModel({
          id,
          name,
          time,
          year,
          image,
          introduce,
      });
      await newMovie.save();
      res.status(201).send({
        message:"Thêm phim thành công",
        data:newMovie
      });
  } catch (error) {
      console.error('Error adding movie:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});
//api sửa
app.put('/movies/:id', async (req, res) => {
  const { id } = req.params; 
  const { name, time, year, image, introduce } = req.body; 
  try {
      const updatedMovie = await MovieModel.findOneAndUpdate(
          { id: id }, 
          {
              name,
              time,
              year,
              image,
              introduce
          },
          { new: true, runValidators: true } 
      );
      if (!updatedMovie) {
          return res.status(404).json({ message: 'Movie not found' });
      }
      res.status(200).send({
        message:"Sửa phim thành công",
        data:updatedMovie
      });
  } catch (error) {
      res.status(500).send({ message: 'Lỗi',data:null });
  }
});
//api xóa
app.delete('/movies/:id', async (req, res) => {
  const { id } = req.params; 
  try {
      const deletedMovie = await MovieModel.findOneAndDelete({ id: id });
      if (!deletedMovie) {
          return res.status(404).send({ message: 'Không tìm thấy' });
      }
      res.status(200).send({ message: 'Xóa phim thành công' });
  } catch (error) {
      res.status(500).send({ message: 'Lỗi' });
  }
});
//api tìm kiếm
app.get('/movies/search', async (req, res) => {
  const { keyword } = req.query; 

  if (!keyword) {
      return res.status(400).send({ message: 'Keyword is required' }); 
  }
  try {
      const movies = await MovieModel.find({ name: { $regex: keyword, $options: 'i' } });
      res.status(200).send({
        message:"Đã tìm thấy",
        data:movies
      });
  } catch (error) {
      res.status(500).send({ message: 'Lỗi',data:null });
  }
});
//api lọc
app.get('/movies/sort', async (req, res) => {
  const { order } = req.query; 
  if (!order || (order !== 'asc' && order !== 'desc')) {
      return res.status(400).send({ message: 'Lỗi' });
  }
  try {
      const sortOrder = order === 'asc' ? 1 : -1; 
      const movies = await MovieModel.find().sort({ year: sortOrder }); 
      res.status(200).send({
        message:"Đã lọc",
        data:movies
      });
  } catch (error) {
      res.status(500).send({ message: 'Lỗi' });
  }
});
//api upload ảnh
app.put('/movies/:id/upload-image', upload.single('image'), async (req, res) => {
  const { id } = req.params; 
  try {
      const result = await cloudinary.v2.uploader.upload(req.file.path);
      const updatedMovie = await MovieModel.findOneAndUpdate(
          { id: id },
          { image: result.secure_url },
          { new: true, runValidators: true } 
      );
      if (!updatedMovie) {
          return res.status(404).json({ message: 'Movie not found' });
      }
      res.status(200).json(updatedMovie);
  } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  } finally {
      if (req.file) {
          fs.unlinkSync(req.file.path); 
      }
  }
});
app.listen(8080,()=>{
    console.log('Server is running')
})