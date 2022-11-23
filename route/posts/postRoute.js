const express = require('express')
const { createPostCtrl, fetchPostsCtrl, fetchPostCtrl, updatePostCtrl } = require('../../controllers/posts/postCtrl')
const authMiddleware = require('../../middlewares/auth/authMiddleware')
const { photoUpload, postImgResize } = require('../../middlewares/uploads/photoUpload')

const postRoute = express.Router()

postRoute.post('/', authMiddleware, photoUpload.single('image'), postImgResize, createPostCtrl)

postRoute.get('/', fetchPostsCtrl)
postRoute.get('/:id', fetchPostCtrl)
postRoute.put('/:id', authMiddleware, updatePostCtrl)
module.exports = postRoute
