"use strict";

var renderer = {
  vertexSource: `#version 300 es
  in vec3 ipos;
  uniform mat4 transformation;
  
  void main() {
    gl_Position = transformation * vec4(ipos, 1.0);
  }
  `,

  fragmentSource: `#version 300 es
  precision mediump float;
  out vec4 ocolor;

  void main() {
    //ocolor = vec4(0.9, 0.6, 0.3, 1.0);
    ocolor = vec4(0.909803, 0.811764, 0.462745, 1.0);
  }
  `,

  numElements: 0,

  resizeCanvas: function(canvas) {
    var displayWidth = canvas.clientWidth;
    var displayHeight = canvas.clientHeight;

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }

  },

  getPolygonVertices: function(numVertices, radius, center, indiceStride) {
    var alpha = 360.0/numVertices;
    var rotation = 90;

    var vertices = [center[0], center[1], 0];
    for (var i = 0; i < numVertices; i++) {
      var coordx = center[0] + radius*Math.cos((alpha*i + rotation)*Math.PI/180.0);
      var coordy = center[1] + radius*Math.sin((alpha*i + rotation)*Math.PI/180.0);
      vertices.push(coordx, coordy);
      vertices.push(0);
    }

    var indices = [];
    for (var i = 1; i < numVertices; ++i) {
      indices.push(indiceStride, indiceStride + i, indiceStride + i + 1);
    }
    indices.push(indiceStride, indiceStride + 1, indiceStride +  numVertices);

    return [vertices, indices];
  },

  getHexaflakeVertices: function(steps, radius, center, stride = 0) {
    if (steps == 0) {
      return;
    }
    else if (steps == 1) {
      return this.getPolygonVertices(6, radius, center, stride);
    }
    else {
      var hexaflakeData = this.getHexaflakeVertices(steps-1, radius*0.3333333333, center, stride);
      for (var i = 0; i < 6; i++) {
        var cx = center[0] + radius*Math.cos((60 * i + 90)*Math.PI/180.0)*(1 - 0.33333333);
        var cy = center[1] + radius*Math.sin((60 * i - 90)*Math.PI/180.0)*(1 - 0.33333333);
        var auxData = this.getHexaflakeVertices(steps-1, radius*0.3333333333, [cx, cy], hexaflakeData[0].length/3 + stride);
        hexaflakeData[0] = hexaflakeData[0].concat(auxData[0]);
        hexaflakeData[1] = hexaflakeData[1].concat(auxData[1]);
      }
      return hexaflakeData;
    }

  },

  createShaderProgram: function(gl, vert_source, frag_source) {
    var vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, vert_source);
    gl.compileShader(vertShader);
    var success = gl.getShaderParameter(vertShader, gl.COMPILE_STATUS);
    if (!success) {
      console.log(gl.getShaderInfoLog(vertShader));
      return undefined;
    }

    var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, frag_source);
    gl.compileShader(fragShader);
    success = gl.getShaderParameter(fragShader, gl.COMPILE_STATUS);
    if (!success) {
      console.log(gl.getShaderInfoLog(fragShader));
      return undefined;
    }

    var program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!success) {
      console.log(gl.getProgramInfoLog(program));

      gl.deleteShader(fragShader);
      gl.deleteShader(vertShader);
      gl.deleteProgram(program);
      return undefined;
    }

    gl.deleteShader(fragShader);
    gl.deleteShader(vertShader);
    return program;
  },

  initVAO: function(gl) {
    var vertexData = this.getHexaflakeVertices(3, 1.0, [0,0]);

    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    var vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexData[0]), gl.STATIC_DRAW);

    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    var ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int32Array(vertexData[1]), gl.STATIC_DRAW);
    this.numElements = vertexData[1].length;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    return vao;
  },

  draw: function(gl, vao) {
    gl.clearColor(56/255, 63/255, 112/255, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindVertexArray(vao);
    //gl.drawElements(gl.LINES, this.numElements, gl.UNSIGNED_INT, 0);
    gl.drawElements(gl.TRIANGLES, this.numElements, gl.UNSIGNED_INT, 0);
  },

  main: function() {
    var canvas = document.getElementById("webgl-canvas");
    this.resizeCanvas(canvas);

    var gl = canvas.getContext("webgl2");

    var vao = this.initVAO(gl);
    var shaderProgram = this.createShaderProgram(gl, this.vertexSource, this.fragmentSource);

    gl.useProgram(shaderProgram);

    var model = mat4.create();
    mat4.scale(model, model, vec3.fromValues(gl.canvas.width/2 - 10, gl.canvas.height/2 - 10, 1));
    var view = mat4.create();
    mat4.translate(view, view, vec3.fromValues(canvas.width/2, canvas.height/2, 0));
    var projection = mat4.create();
    mat4.ortho(projection, 0, canvas.width, canvas.height, 0, -1, 1);

    var finalTransformation = mat4.create();
    mat4.multiply(finalTransformation, view, model);
    mat4.multiply(finalTransformation, projection, finalTransformation);
    
    var transformationLoc = gl.getUniformLocation(shaderProgram, "transformation");
    gl.uniformMatrix4fv(transformationLoc, false, finalTransformation);

    this.draw(gl, vao);
  },
};

renderer.main();
