var Promise = require('promise');
var express = require('express');
var router = express.Router();
var main = require('../public/javascripts/main.js')

/* GET home page. */
router.get('/', function(req, res, next) {
  res.set('Content-Type', 'text/html')
  console.log('INITIATE')
  res.render('index', { title: 'Express' })
  res.end()
  main.getHTML().then((htmlString) => {
    // var jquery = `<script
    // src="https://code.jquery.com/jquery-3.4.1.min.js"
    // integrity="sha256-CSXorXvZcTkaix6Yvo6HppcZGetbYMGWSFlBw8HfCJo="
    // crossorigin="anonymous"></script>`

    console.log('TERMINATE')
    // res.send(Buffer.from(htmlString + jquery))
    // res.end()
  })
});

module.exports = router;
