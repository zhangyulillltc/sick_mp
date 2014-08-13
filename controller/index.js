var c ={};
exports = module.exports= c;
c.index=function(req,res,callback){
	process.nextTick(function(){
		process.nextTick(function(){
		callback(null,"hello")
		});
	});
}