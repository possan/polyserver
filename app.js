var express = require('express');
var app = express();
var bodyParser = require('body-parser')
var Vectorizer = require('./vectorizer');

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json({ type: 'application/*+json' }))

app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});

app.get('/', function (req, res) {
  res.send('Hello World');
});

app.post('/convert', function (req, res, done) {
	var v = new Vectorizer();
	v.url = req.query.url || req.params.url || req.body.url || '';
	v.cutoff = req.query.cutoff || req.params.cutoff || req.body.cutoff || 5000;
	v.threshold = req.query.threshold || req.params.threshold || req.body.threshold || 40;
	v.go(function() {
		if (v.error) {
			res.send({
				error: v.error,
			}, 400);
		} else {
			res.send({
				url: v.url,
				cutoff: v.cutoff,
				width: v.width,
				height: v.height,
				tris: v.tris
			});
		}
	});
});

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});
