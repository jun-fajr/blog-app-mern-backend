const express = require('express')
const {
  userRegisterCtrl,
  loginUserCtrl,
  fetchUsersCtrl,
  deleteUsersCtrl,
  fetchUserDetailsCtrl
} = require('../../controllers/users/usersCtrl')

const userRoutes = express.Router()

userRoutes.post('/register', userRegisterCtrl)
userRoutes.post('/login', loginUserCtrl)
userRoutes.get('/', fetchUsersCtrl)
userRoutes.delete('/:id', deleteUsersCtrl)
userRoutes.get('/:id', fetchUserDetailsCtrl)
module.exports = userRoutes
