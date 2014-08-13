function func() {
	this.prototype.author = 'shi';
	this.author = 'shi';
}
exports = module.exports = func;

func.Async = function(task) {
	var gen = task(callback);
	function callback(err, result) {
		console.log(result);
		if (err) {
			throw err;
		} else {
			gen.next(result);
		}
	}
	gen.next();
}