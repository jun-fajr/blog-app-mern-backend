const expressAsyncHandler = require('express-async-handler')
const sgMail = require('@sendgrid/mail')
const crypto = require('crypto')
const generateToken = require('../../config/token/generateToken')
const User = require('../../model/user/User')
const validateMongodbId = require('../../utils/validateMongodbID')
const cloudinaryUploadImg = require('../../utils/cloudinary')
sgMail.setApiKey(process.env.SEND_GRID_API_KEY)

//-------------------------------------
//Register
//-------------------------------------

const userRegisterCtrl = expressAsyncHandler(async (req, res) => {
  //Check if user Exist
  const userExists = await User.findOne({ email: req?.body?.email })

  if (userExists) throw new Error('User already exists')
  try {
    //Register user
    const user = await User.create({
      firstName: req?.body?.firstName,
      lastName: req?.body?.lastName,
      email: req?.body?.email,
      password: req?.body?.password
    })
    res.json(user)
  } catch (error) {
    res.json(error)
  }
})

//-------------------------------
//Login user
//-------------------------------

const loginUserCtrl = expressAsyncHandler(async (req, res) => {
  const { email, password } = req.body
  //check if user exists
  const userFound = await User.findOne({ email })
  //Check if password is match
  if (userFound && (await userFound.isPasswordMatched(password))) {
    res.json({
      _id: userFound?._id,
      firstName: userFound?.firstName,
      lastName: userFound?.lastName,
      email: userFound?.email,
      profilePhoto: userFound?.profilePhoto,
      isAdmin: userFound?.isAdmin,
      token: generateToken(userFound?._id)
    })
  } else {
    res.status(401)
    throw new Error('Invalid Login Credentials')
  }
})

//------------------------------
//Users
//-------------------------------
const fetchUsersCtrl = expressAsyncHandler(async (req, res) => {
  console.log(req.headers)
  try {
    const users = await User.find({})
    res.json(users)
  } catch (error) {
    res.json(error)
  }
})

//------------------------------
//Delete user
//------------------------------
const deleteUsersCtrl = expressAsyncHandler(async (req, res) => {
  const { id } = req.params
  //check if user id is valid
  validateMongodbId(id)
  try {
    const deletedUser = await User.findByIdAndDelete(id)
    res.json(deletedUser)
  } catch (error) {
    res.json(error)
  }
})

//----------------
//user details
//----------------
const fetchUserDetailsCtrl = expressAsyncHandler(async (req, res) => {
  const { id } = req.params
  //check if user id is valid
  validateMongodbId(id)
  try {
    const user = await User.findById(id)
    res.json(user)
  } catch (error) {
    res.json(error)
  }
})

//------------------------------
//User profile
//------------------------------

const userProfileCtrl = expressAsyncHandler(async (req, res) => {
  const { id } = req.params
  validateMongodbId(id)
  try {
    const myProfile = await User.findById(id)
    res.json(myProfile)
  } catch (error) {
    res.json(error)
  }
})

//------------------------------
//Update profile
//------------------------------
const updateUserCtrl = expressAsyncHandler(async (req, res) => {
  const { _id } = req?.user
  validateMongodbId(_id)
  const user = await User.findByIdAndUpdate(
    _id,
    {
      firstName: req?.body?.firstName,
      lastName: req?.body?.lastName,
      email: req?.body?.email,
      bio: req?.body?.bio
    },
    {
      new: true,
      runValidators: true
    }
  )
  res.json(user)
})

//------------------------------
//Update password
//------------------------------

const updateUserPasswordCtrl = expressAsyncHandler(async (req, res) => {
  //destructure the login user
  const { _id } = req.user
  const { password } = req.body
  validateMongodbId(_id)
  //Find the user by _id
  const user = await User.findById(_id)

  if (password) {
    user.password = password
    const updatedUser = await user.save()
    res.json(updatedUser)
  } else {
    res.json(user)
  }
})

//------------------------------
//following
//------------------------------

const followingUserCtrl = expressAsyncHandler(async (req, res) => {
  //1.Find the user you want to follow and update it's followers field
  //2. Update the login user following field
  const { followId } = req.body
  const loginUserId = req.user.id

  //find the target user and check if the login id exist
  const targetUser = await User.findById(followId)

  const alreadyFollowing = targetUser?.followers?.find(user => user?.toString() === loginUserId.toString())

  if (alreadyFollowing) throw new Error('You have already followed this user')

  //1. Find the user you want to follow and update it's followers field
  await User.findByIdAndUpdate(
    followId,
    {
      $push: { followers: loginUserId },
      isFollowing: true
    },
    { new: true }
  )

  //2. Update the login user following field
  await User.findByIdAndUpdate(
    loginUserId,
    {
      $push: { following: followId }
    },
    { new: true }
  )
  res.json('You have successfully followed this user')
})

//------------------------------
//unfollow
//------------------------------

const unfollowUserCtrl = expressAsyncHandler(async (req, res) => {
  const { unFollowId } = req.body
  const loginUserId = req.user.id

  await User.findByIdAndUpdate(
    unFollowId,
    {
      $pull: { followers: loginUserId },
      isFollowing: false
    },
    { new: true }
  )

  await User.findByIdAndUpdate(
    loginUserId,
    {
      $pull: { following: unFollowId }
    },
    { new: true }
  )

  res.json('You have successfully unfollowed this user')
})

//------------------------------
//Block user
//------------------------------

const blockUserCtrl = expressAsyncHandler(async (req, res) => {
  const { id } = req.params
  validateMongodbId(id)

  const user = await User.findByIdAndUpdate(
    id,
    {
      isBlocked: true
    },
    { new: true }
  )
  res.json(user)
})

//------------------------------
//Block user
//------------------------------

const unBlockUserCtrl = expressAsyncHandler(async (req, res) => {
  const { id } = req.params
  validateMongodbId(id)

  const user = await User.findByIdAndUpdate(
    id,
    {
      isBlocked: false
    },
    { new: true }
  )
  res.json(user)
})

//------------------------------
// Generate Email verification token
//------------------------------
const generateVerificationTokenCtrl = expressAsyncHandler(async (req, res) => {
  const loginUserId = req.user.id

  const user = await User.findById(loginUserId)

  try {
    //Generate token
    const verificationToken = await user.createAccountVerificationToken()
    //save the user
    await user.save()
    console.log(verificationToken)
    //build your message

    const resetURL = `If you were requested to verify your account, verify now within 10 minutes, otherwise ignore this message <a href="http://localhost:3000/verify-account/${verificationToken}">Click to verify your account</a>`
    const msg = {
      to: 'ffdfd@gmail.com',
      from: 'twentekghana@gmail.com',
      subject: 'Verify your account',
      html: resetURL
    }

    await sgMail.send(msg)
    res.json(resetURL)
  } catch (error) {
    res.json(error)
  }
})

//------------------------------
//Account verification
//------------------------------
const accountVerificationCtrl = expressAsyncHandler(async (req, res) => {
  const { token } = req.body
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
  //find this user by token
  const userFound = await User.findOne({
    accountVerificationToken: hashedToken,
    accountVerificationTokenExpires: { $gt: new Date() }
  })
  if (!userFound) throw new Error('Token expired, try again later')
  //update the proprt to true
  userFound.isAccountVerified = true
  userFound.accountVerificationToken = undefined
  userFound.accountVerificationTokenExpires = undefined
  await userFound.save()
  res.json(userFound)
})

//------------------------------
//Forget token generator
//------------------------------

const forgetPasswordToken = expressAsyncHandler(async (req, res) => {
  //find the user by email
  const { email } = req.body

  const user = await User.findOne({ email })
  if (!user) throw new Error('User Not Found')

  try {
    //Create token
    const token = await user.createPasswordResetToken()
    console.log(token)
    await user.save()

    //build your message
    const resetURL = `If you were requested to reset your password, reset now within 10 minutes, otherwise ignore this message <a href="http://localhost:3000/reset-password/${token}">Click to Reset</a>`
    const msg = {
      to: email,
      from: 'twentekghana@gmail.com',
      subject: 'Reset Password',
      html: resetURL
    }

    await sgMail.send(msg)
    res.json({
      msg: `A verification message is successfully sent to ${user?.email}. Reset now within 10 minutes, ${resetURL}`
    })
  } catch (error) {
    res.json(error)
  }
})

//------------------------------
//Password reset
//------------------------------

const passwordResetCtrl = expressAsyncHandler(async (req, res) => {
  const { token, password } = req.body
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

  //find this user by token
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  })
  if (!user) throw new Error('Token Expired, try again later')

  //Update/change the password
  user.password = password
  user.passwordResetToken = undefined
  user.passwordResetExpires = undefined
  await user.save()
  res.json(user)
})
//------------------------------
//Profile photo upload
//------------------------------

const profilePhotoUploadCtrl = expressAsyncHandler(async (req, res) => {
  //Find the login user
  const { _id } = req.user

  //1. Get the oath to img
  const localPath = `public/images/profile/${req.file.filename}`
  //2.Upload to cloudinary
  const imgUploaded = await cloudinaryUploadImg(localPath)

  const foundUser = await User.findByIdAndUpdate(
    _id,
    {
      profilePhoto: imgUploaded?.url
    },
    { new: true }
  )
  res.json(foundUser)
})

module.exports = {
  profilePhotoUploadCtrl,
  forgetPasswordToken,
  generateVerificationTokenCtrl,
  userRegisterCtrl,
  loginUserCtrl,
  fetchUsersCtrl,
  deleteUsersCtrl,
  fetchUserDetailsCtrl,
  userProfileCtrl,
  updateUserCtrl,
  updateUserPasswordCtrl,
  followingUserCtrl,
  unfollowUserCtrl,
  blockUserCtrl,
  unBlockUserCtrl,
  accountVerificationCtrl,
  passwordResetCtrl
}
