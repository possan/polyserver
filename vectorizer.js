var fs = require('fs');
var apngCanvasParser = require('apng-canvas-parser');
var restler = require('restler');
var jpeg = require('jpeg-js');
var Delaunay = require('./delaunay');

function Vectorizer() {
	this.url = '';
	this.cutoff = 5000;
	this.threshold = 30;
	this.tris = [];
	this.points = []; // X,Y
	this.pixels = []; // RGBA
	this.graypixels = []; // XXXA
	this.width = 0;
	this.height = 0;
	this.error = undefined;
}


function shuffle(o){
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
}


Vectorizer.prototype.go = function(callback) {
	var _this = this;
	_this.loadPixels(function(ok1) {
		if (!ok1) {
			_this.error = 'Failed to load image';
			callback(false);
			return;
		}

		_this.findDetails(function(ok2) {
			if (!ok1) {
				_this.error = 'Failed to find details in image';
				callback(false);
				return;
			}

			_this.vectorize(function(ok3) {
				if (!ok1) {
					_this.error = 'Failed to vectorize details';
					callback(false);
					return;
				}

				callback(true);
			});
		});
	});
}




Vectorizer.prototype.loadPixels = function(callback) {
	var _this = this;
	restler.get(this.url, { decoding: 'buffer' }).on('complete', function(result) {
	  if (result instanceof Error) {
		console.error('restler error:', result.message);
		callback(false);
	  } else {
	  	console.log('got ' + result.length + ' bytes of image data');

	  	try {
			var rawImageData = jpeg.decode(result);
			_this.width = rawImageData.width;
			_this.height = rawImageData.height;
			_this.pixels = rawImageData.data;
			callback(true);
		} catch(e2) {
			try {
				var t = apngCanvasParser(result);
				t.then(function(images) {
					_this.width = images[0].width;
					_this.height = images[0].height;
					_this.pixels = images[0].data;
					callback(true);
				});
			}
			catch(e) {
				console.error('png crash', e, e.stack);
			}
			console.error('jpg crash', e2, e2.stack);
			callback(false);
		}
	  }
	});
}

Vectorizer.prototype.findDetails = function(callback) {
	var _this = this;

	var PX = this.pixels;
	var GX = this.graypixels;

	var PT = [];

	// pass 1 gray it out
	for(var j=0; j<this.height; j++) {
		for(var i=0; i<this.width; i++) {
			var bo = ((j * this.width) + i) * 4;
			var c0 = (PX[bo + 0] + PX[bo + 1] + PX[bo + 2]) / 3;
			GX[bo + 0] = c0;
			GX[bo + 1] = c0;
			GX[bo + 2] = c0;
			GX[bo + 3] = 255;
		}
	}

	// pass 2 filter
	for(var j=0; j<this.height; j++) {
		for(var i=0; i<this.width; i++) {
			if (i > 4 && j > 4 && i < (this.width-4) && j < (this.height-4)) {
				var bo = ((j * this.width) + i) * 4;
				var c0 = GX[bo];
				var cl = GX[bo - 4];
				var cr = GX[bo + 4];
				var cu = GX[bo - 4 * this.width];
				var cd = GX[bo + 4 * this.width];
				var rr = (cl + cr + cu + cd) / 4;
				var cc = Math.abs(c0 - rr);
				cc *= cc;
				cc /= 3;
				if (cc > this.threshold) {
					PT.push({ x: i, y: j });
				}
			}
		}
	}

	// remove some points, totally random...
	PT = shuffle(PT);
	PT = PT.slice(0, this.cutoff);

	// add some random side points...
	for(var i=0; i<this.width; i+=30) {
		var v = i;
		v += Math.random() * 30;
		if (v < 0) v = 0;
		if (v > this.width) v = this.width;
		PT.push({ x: v, y: 0 });

		v = i;
		v += Math.random() * 30;
		if (v < 0) v = 0;
		if (v > this.width) v = this.width;
		PT.push({ x: v, y: this.height-1 });
	}

	for(var i=0; i<this.height; i+=30) {
		var v = i;
		v += Math.random() * 30;
		if (v < 0) v = 0;
		if (v > this.height) v = this.height;
		PT.push({ x: 0, y: v });

		v = i;
		v += Math.random() * 30;
		if (v < 0) v = 0;
		if (v > this.height) v = this.height;
		PT.push({ x: this.width - 1, y: v });
	}

	// add some random points inside the image
	for(var i=0; i<100; i++) {
		PT.push({ x: Math.random() * this.width, y: Math.random() * this.height });
	}

	// make sure corners are there
	PT.push({ x: 0, y: 0 });
	PT.push({ x: this.width-1, y: 0 });
	PT.push({ x: this.width-1, y: this.height-1 });
	PT.push({ x: 0, y: this.height-1 });

	this.points = PT.map(function(x) {
    	return [x.x, x.y];
  	});

  	console.log('Generated ' + this.points.length + ' points of detail.');
	callback(true);
}

Vectorizer.prototype.vectorize = function(callback) {
	var _this = this;

	var PX = this.pixels;

	var tris = Delaunay.triangulate(this.points);
	console.log('tris.length / 3', tris.length / 3);

	var tricolors = [];
	var trisoutput = [];

	for(var i=0; i<tris.length; i+=3) {
		var v0 = tris[i + 0];
		var v1 = tris[i + 1];
		var v2 = tris[i + 2];

		var x0 = this.points[v0][0];
		var y0 = this.points[v0][1];
		var x1 = this.points[v1][0];
		var y1 = this.points[v1][1];
		var x2 = this.points[v2][0];
		var y2 = this.points[v2][1];

		var cx = Math.round((x0 + x1 + x2) / 3);
		var cy = Math.round((y0 + y1 + y2) / 3);

		var bo = (cy * this.width + cx) * 4;
		tricolors.push([
			PX[bo + 0],
			PX[bo + 1],
			PX[bo + 2],
		]);
	}


	for(var i=0; i<Math.floor(tris.length / 3); i++) {
		var v0 = tris[i * 3 + 0];
		var v1 = tris[i * 3 + 1];
		var v2 = tris[i * 3 + 2];

		var cc = tricolors[i];

		var x0 = Math.floor(this.points[v0][0]);
		var y0 = Math.floor(this.points[v0][1]);
		var x1 = Math.floor(this.points[v1][0]);
		var y1 = Math.floor(this.points[v1][1]);
		var x2 = Math.floor(this.points[v2][0]);
		var y2 = Math.floor(this.points[v2][1]);

		trisoutput.push({
			x0: x0,
			y0: y0,
			x1: x1,
			y1: y1,
			x2: x2,
			y2: y2,

			r: cc[0],
			g: cc[1],
			b: cc[2],
		});
	}

	this.tris = trisoutput;

	callback(true);
}

module.exports = Vectorizer;
