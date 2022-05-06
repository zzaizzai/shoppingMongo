var router = require('express').Router();

function checklogin(req, res, next) {
    if (req.user) {
      next()
    } else {
      res.send('please login')
    }
  
  }

router.use(checklogin)

router.get('/shirts', function(req, res){
    res.send('shirts Page')
})
  
router.get('/pants', function(req, res){
    res.send('pants page')

})

module.exports = router;