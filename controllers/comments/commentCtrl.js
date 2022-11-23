const expressAsyncHandler = require('express-async-handler')
const Comment = require('../../model/comment/Comment')

//-------------------------------------------------------------
//Create
//-------------------------------------------------------------
const createCommentCtrl = expressAsyncHandler(async (req, res) => {
  //1.Get the user
  const user = req.user
  //2.Get the post Id
  const { postId, description } = req.body
  console.log(description)
  try {
    const comment = await Comment.create({
      post: postId,
      user,
      description
    })
    res.json(comment)
  } catch (error) {
    res.json(error)
  }
})

//-------------------------------
//fetch all comments
//-------------------------------

const fetchAllCommentsCtrl = expressAsyncHandler(async (req, res) => {
  try {
    const comments = await Comment.find({}).sort('-created')
    res.json(comments)
  } catch (error) {
    res.json(error)
  }
})

module.exports = { createCommentCtrl, fetchAllCommentsCtrl }
