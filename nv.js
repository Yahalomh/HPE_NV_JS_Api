
var http ;
var nvServerPort;
var nvServerUrl;
var username;
var password;
var testToken;
var transactionToken;
var transactionIdentifier;
var transactionManagerSessionIdentifier;
var flowID;

exports.init = function (ssl,serverurl,port,user,pass){
	nvServerUrl  = serverurl;
	nvServerPort = port;
	username     = user;
     password     = pass;
	 
	if(ssl==true) {
         process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
         http = require('https');
     }
	else
		http = require('http');
}

// get my IP
exports.getMyIP = function(){
	var os = require('os');

	var interfaces = os.networkInterfaces();
	var addresses = [];
	for (var k in interfaces) {
		for (var k2 in interfaces[k]) {
			var address = interfaces[k][k2];
			if (address.family === 'IPv4' && !address.internal) {
				addresses.push(address.address);
			}
		}
	}
	
	return addresses;
}


function createHeader(contentSize){
    return {		
        "Content-Length" : contentSize,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": "Basic " + new Buffer(username + ':' + password).toString('base64')
    };
}


// Start the record
exports.startRecord = function (my_ip,testName,latency,packetloss,bandwidthIn,bandwidthOut){

	var promise = new Promise(function(callback,error){
	
		//start the record
        flowID =require('node-uuid').v1();
		
		var jsonObject = JSON.stringify(
				{"flows":[
					{"flowId":flowID,
					"latency":latency,
					"packetloss":packetloss,
					"bandwidthIn":bandwidthIn,
					"bandwidthOut":bandwidthOut,
					"isCaptureClientPL":true,
					"srcIpRange":{"include":[{"from":my_ip,"to":my_ip,"port":0,"protocol":0}],"exclude":[]},
					"destIpRange":{"include":[{"from":"0.0.0.1","to":"255.255.255.255","port":0,"protocol":0}],
					"exclude":[{"from":my_ip,"to":my_ip,"port":0,"protocol":0}]}}],
					"testMetadata":{"testName":testName,"isCustom":true,"networkScenario":"Network scenario 2","emulationMode":"MULTI_USER"}}
		);

		var options = {
		 host: nvServerUrl,
		 port: nvServerPort,
		 path: '/shunra/api/emulation/custom?mode=MULTI_USER',
		 method: 'POST', 
		 headers: createHeader(Buffer.byteLength(jsonObject, 'utf8'))
		};

		var reqPost = http.request(options, function(res) {
		
		 console.log('Start record status: ' + res.statusCode);
		 
		 if (res.statusCode < 400) {
		 
			 res.setEncoding('utf8');
			 
			 var str = '';

			 res.on('data', function (chunk) {

				 str += chunk;
			 });
			 
			 res.on('end', function () {
				 testToken = testToken = JSON.parse(str).testToken;
				 console.log("The test token is " + testToken);

				 callback();
			 });
			 
		 }
		 else{
			console.log('NV server Error. server returns ' + res.statusCode);
			error(res);
		 }
		 
		});
		
		reqPost.write(jsonObject);
		reqPost.end();
		
	});

	return promise;
}


startTransaction2 = function(callback){

	var jsonObject = JSON.stringify(
		{"overwriteExistingConnection":true}
	);
				 				 
	var options = {
		host: nvServerUrl,
		port: nvServerPort,
		path: '/shunra/api/transactionmanager/' + testToken,
		method: 'POST', 
		headers: createHeader(Buffer.byteLength(jsonObject, 'utf8'))
	};
				 
				 
	var reqPost = http.request(options, function(res) {
	
		if (res.statusCode < 400) {		  			
			
			res.setEncoding('utf8');

			str = '';

			res.on('data', function (chunk) {
				str += chunk;
			});
			
			
			res.on('end', function () {		
			
				transactionManagerSessionIdentifier = JSON.parse(str).transactionManagerSessionIdentifier;				
				
				console.log("transaction manager " + transactionManagerSessionIdentifier);
				
				callback(res.statusCode);
				
				
			});
		}
	 
		else{
			console.log('NV server Error. server returns ' + res.statusCode);
			
			callback(res.statusCode);
		}
	 
	});
	
	reqPost.write(jsonObject);
	reqPost.end();

}


startTransaction3 = function(transactionName,transactionDescriptor,callback){

	var jsonObject = JSON.stringify(	
			{"transactionName":transactionName,"transactionDescription":transactionDescriptor,"transactionId":transactionToken}							
	);
				 				 
	var options = {
		host: nvServerUrl,
		port: nvServerPort,
		path: '/shunra/api/transactionmanager/transaction/' + transactionManagerSessionIdentifier,
		method: 'POST', 
		headers: createHeader(Buffer.byteLength(jsonObject, 'utf8'))
	};
				 
				 
	var reqPost = http.request(options, function(res) {
	
		console.log("transaction start record status " + res.statusCode);
	
		if (res.statusCode < 400) {		  			
			
			res.setEncoding('utf8');

			str = '';

			res.on('data', function (chunk) {
				str += chunk;
			});
			
			
			res.on('end', function () {		

				transactionIdentifier = JSON.parse(str).transactionIdentifier;	
				
				console.log("transaction identifier is " + transactionIdentifier);
			
				callback(res.statusCode);
								
			});
		}
	 
		else{
			console.log('NV server Error. server returns ' + res.statusCode);
			
			callback(res.statusCode);
		}
	 
	});
	
	reqPost.write(jsonObject);
	reqPost.end();

}



// stop transaction
exports.stopTransaction = function (){

	var promise = new Promise(function(callback,error){
	
		var jsonObject = JSON.stringify(
				{"passed":true}
		);

		var options = {
		 host: nvServerUrl,
		 port: nvServerPort,
		 path: '/shunra/api/transactionmanager/transaction/' + transactionManagerSessionIdentifier + '/' + transactionIdentifier,
		 method: 'PUT', 
		 headers: createHeader(Buffer.byteLength(jsonObject, 'utf8'))
		};

		var reqPost = http.request(options, function(res) {
		
		 console.log('Stop transaction status: ' + res.statusCode);
		 
		 if (res.statusCode < 400) {

			 callback(res.statusCode);
			
		 }
		 else{
			console.log('NV server Error. server returns ' + res.statusCode);
			error(res);
		 }
		 
		});
		
		reqPost.write(jsonObject);
		reqPost.end();
		
	});

	return promise;
}



// Start transaction
exports.startTransaction = function (transactionName,transactionDescriptor){
	var promise = new Promise(function(callback,error){

		//start the record

		var jsonObject = JSON.stringify(
				{"transactionName":transactionName,
				"transactionDescription":transactionDescriptor
				}
		);

		var options = {
		 host: nvServerUrl,
		 port: nvServerPort,
		 path: '/shunra/api/transaction/' + testToken,
		 method: 'POST', 
		 headers: createHeader(Buffer.byteLength(jsonObject, 'utf8'))
		};

		var reqPost = http.request(options, function(res) {
		
		 console.log('Add transaction status: ' + res.statusCode);
		 
		 if (res.statusCode < 400) {		  
			
			 res.setEncoding('utf8');
			 
			 var str = '';

			 res.on('data', function (chunk) {
				 str += chunk;
			 });
			 
			 res.on('end', function () {
			 
				 transactionToken  =  JSON.parse(str).id;
				 
				 console.log("The transaction id is " + transactionToken);					
				 				  
				 startTransaction2(function(statusCode){
					
					if(statusCode<400){
					
						startTransaction3(transactionName,transactionDescriptor,function(statusCode){						
							callback(statusCode);							
						});					
						
					}
					else
						error(statusCode);
				 
				 });
				 
				 
			 });
			
		 }
		 else{
			console.log('NV server Error. server returns ' + res.statusCode);
			error(res);
		 }
		 
		});
		
		reqPost.write(jsonObject);
		reqPost.end();
		
	});

	return promise;
}







// stop the record
exports.stopRecord= function (){


	var promise = new Promise(function(callback,error){

		console.log("Close test " + testToken);

		var jsonObject = JSON.stringify(
				{"testTokens":[ testToken ]}
		);

		
		//console.log(jsonObject);
		
		var options = {
		 host: nvServerUrl,
		 port: nvServerPort,
		 path: '/shunra/api/emulation/stop',
		 method: 'PUT', 
		 headers: createHeader(Buffer.byteLength(jsonObject, 'utf8'))
		};

		var reqPost = http.request(options, function(res) {
		 console.log('Stop record status: ' + res.statusCode);
		 callback(res.statusCode);	  
		});

		reqPost.write(jsonObject);
		reqPost.end();
	});
	
	return promise;
}

// function to analyze and get the report
exports.getAnalyze = function (ports){


	var promise = new Promise(function(callback,error){
	
		console.log("analyze test " + testToken);

		var options = {
		 host: nvServerUrl,
		 port: nvServerPort,
		 path: '/shunra/api/analysisreport/analyze/' + testToken + "?ports=" + ports + "&zipResult=false",
		 method: 'PUT', 
		 headers: createHeader(0)
		};
	
		var reqPost = http.request(options, function(res) {
		
		 console.log('analyze record status: ' + res.statusCode);
		 
		 if (res.statusCode < 400) {
		 
			 var encoding = res.headers['content-encoding'];
				 
			 var chunks = [];
			
			 res.on('data', function (chunk) {		  			
				chunks.push(chunk);
			 });
			 
			 res.on('end', function () { 
			 
				 console.log("finish getting the analyze " + testToken);

				 var buffer = Buffer.concat(chunks);
				 
				 if (encoding == 'gzip') {
						var zlib = require('zlib');
						zlib.gunzip(buffer, function(err, decoded) {
						callback(decoded.toString());
						});
				 } 
				 
				 else if (encoding == 'deflate') {
						var zlib = require('zlib');
						zlib.inflate(buffer, function(err, decoded) {
						callback(decoded.toString());
					})
				 }

				 else {
					callback(buffer.toString());
				 }
				 
			 });
			 
		 }
		 else{
			console.log('NV server Error. server returns ' + res.statusCode);
			error(res);
		 }
		 
		}).end();
	
	});
	
	return promise;

}
