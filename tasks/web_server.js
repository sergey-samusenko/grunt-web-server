/*
 * grunt-web-server
 * https://github.com/eob/grunt-web-server
 *
 * Copyright (c) 2013 Ted Benson
 * Licensed under the MIT license.
 */

'use strict';

var http = require('http'),
    url  = require('url'),
    path = require('path'),
    fs   = require('fs');

module.exports = function(grunt) {

    var server = function(target) {
    var self = this;
    var mimeTypes = {
        "html": "text/html",
        "jpeg": "image/jpeg",
        "jpg" : "image/jpeg",
        "png" : "image/png",
        "js"  : "text/javascript",
        "css" : "text/css"};
    
    var port = 1337;
    var cors = true;
    var nevercache = true;
    var logRequests = true;

    if (typeof target != 'undefined') {
      if (typeof target.port != 'undefined') {
        port = target.port;
      }
      if (typeof target.cors != 'undefined') {
        if (target.cors == true) {
          cors = true;
        }
      }
      if (typeof target.logRequests != 'undefined') {
        if (target.logRequests == false) {
          logRequests = false;
        }
      }
    }

    var corsStr = cors ? "on".green : "off".red;
    var cacheStr = nevercache ? "on".green : "off".red;
    var logStr = logRequests ? "on".green : "off".red;

    grunt.log.writeln('');
    grunt.log.writeln('Starting HTTP Server');
    grunt.log.writeln('  - Listening on port ' + (''+port).green);
    grunt.log.writeln('  - Cross-Origin Resource Sharing is ' + corsStr);
    grunt.log.writeln('  - Cache suppressor is ' + corsStr);
    grunt.log.writeln('  - Request logger is ' + corsStr);
    grunt.log.writeln('');
  
    var buildHeaderDict = function() {
      var headers = {}
      if (cors) {
        headers['Access-Control-Allow-Headers'] = 'x-requested-with';
        headers['Access-Control-Allow-Methods'] = 'GET, PUT, POST, HEAD, OPTIONS';
        headers['Access-Control-Allow-Origin'] = '*';
      }
      if (nevercache) {
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        headers['Pragma'] = 'no-cache';
        headers['Expires'] = '0';
      }
      return headers;
    }

    http.createServer(function(req, res) {
 
      var uri = url.parse(req.url).pathname;
      var filename = path.join(process.cwd(), unescape(uri));
      var stats;
      var headers = buildHeaderDict();

      try {
        stats = fs.lstatSync(filename); // throws if path doesn't exist
      } catch (e) {
        grunt.log.writeln(e);
        headers['Content-Type'] = 'text/plain';
        res.writeHead(404, headers);
        res.write('404 Not Found\n');
        res.end();
        if (logRequests) {
          grunt.log.writeln(('[404] ' + filename).red);
        }
        return;
      }
    
      if (stats.isFile()) {
        // path exists, is a file
        if (logRequests) {
          grunt.log.writeln(('[200] ' + filename));
        }
        var mimeType = mimeTypes[path.extname(filename).split(".")[1]];
        headers['Content-Type'] = mimeType;
        res.writeHead(200, headers);
        var fileStream = fs.createReadStream(filename);
        fileStream.pipe(res);
      } else if (stats.isDirectory()) {
        if (logRequests) {
          grunt.log.writeln(('[200] <Directory> ' + filename).yellow);
        }
        var files = fs.readdirSync(filename);
        var resp = "<h2>" + filename + "</h2>";
        var filelinks = [];
        var dirlinks = [];
        for (var i = 0; i < files.length; i++) {
          var file = files[i];
          var base = filename;
          if (base[base.length - 1] != '/') {
            base += "/";
          }
          var uribase = unescape(uri);
          if (uribase[uribase.length - 1] != '/') {
            uribase += "/";
          }
          var theUrl = uribase + file;
          var theFile = base + file;
          if (fs.lstatSync(theFile).isDirectory()) {
            dirlinks.push('<a href="' + theUrl + '">' + file + "</a><br>");
          } else { filelinks.push('<a href="' + theUrl + '">' + file + "</a><br>");
          }
        }
        resp += "<h3>Folders</h3>";
        for (var i = 0; i < dirlinks.length; i++) {
          resp += dirlinks[i];
        }
        resp += "<h3>Files</h3>";
        for (var i = 0; i < filelinks.length; i++) {
          resp += filelinks[i];
        }
        // path exists, is a directory
        headers['Content-Type'] = 'text/html';
        res.writeHead(200, headers);
        res.write(resp);
        res.end();
      } else {
        // Don't follow symlinks for now
        res.writeHead(500, {'Content-Type': 'text/plain'});
        res.write('500 Internal server error\n');
        if (logRequests) {
          grunt.log.writeln(('[500] <Symlink> ' + filename).red);
        }
        res.end();
        // This is a test
      }
    }).listen(port);

    // Keep it alive
    this.async();
  };

  grunt.registerMultiTask('web_server',
      "A Web Server similar to Python's SimpleHTTPServer," +
      " with Cross-Origin Resource Sharing and No-Cache options.",
      server);

};
