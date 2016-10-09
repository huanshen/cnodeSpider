var eventproxy=require('eventproxy');
var superagent=require('superagent');
var cheerio=require('cheerio');
var url=require('url');
var express=require('express');
var async = require('async');

var app=express();

var cnodeUrls=[];

//入口html
for(var i=1 ; i<= 2; i++){
    cnodeUrls.push('https://cnodejs.org/?tab=good&page='+i);
}


var result=[];
function getUrls(){

  cnodeUrls.forEach(function(cnodeUrl){
      superagent.get(cnodeUrl)
        .end(function(err,res){
          if(err){
            return next(err);
          }

          
          var $=cheerio.load(res.text);

          $('#topic_list .topic_title').each(function (idx, element) {
                var $element = $(element);
                var href = url.resolve(cnodeUrl, $element.attr('href'));
                result.push(href);
               
          });
      });
  });
  return result;
  
}

app.get('/',function(req,sres,next){
    var topicUrls=getUrls();

    var eq=new eventproxy();

    eq.after('topic_html',topicUrls.length,function(topics){
      topics=topics.map(function(topicPair){
        var topicUrl=topicPair[0];
        var topichtml=topicPair[1];
        var $=cheerio.load(topichtml);
        return({
          title:$('.topic_full_title').text().trim(),
          href: topicUrl,
          comment1:$('.reply_content').eq(0).text().trim(),
        });
      });
      
        sres.send(topics);
    });


    var curCount = 0;
    var reptileMove = function(url,callback){
      //延迟毫秒数
      var delay = parseInt((Math.random() * 30000000) % 1000, 10);
      curCount++;
      console.log('现在的并发数是', curCount, '，正在抓取的是', url, '，耗时' + delay + '毫秒');  
            
      superagent.get(url)
            .end(function(err,sres){
                  // 常规的错误处理
            if (err) {
              console.log(err);
              return;
            }    

          //sres.text 里面存储着请求返回的 html 内容  
          eq.emit('topic_html',[url,sres.text]);
          
                        
            });

      setTimeout(function() {
          curCount--;
          callback(null,[url,sres.text]);
        }, delay);            
    };             

    // 使用async控制异步抓取  
    // mapLimit(arr, limit, iterator, [callback])
    // 异步回调
    async.mapLimit(topicUrls, 5, function (topicUrl, callback) {
          reptileMove(topicUrl, callback);
    });
});

app.listen(3000,function(){
      console.log('app is run')
})