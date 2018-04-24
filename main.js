"use strict";

var canvas, gl, program;

var modelViewMatrixLoc, normalLoc;
var modelViewMatrix = [];

var position = []
var color = []
var normals = []


const X_OFFSET_OBJ_1 = -3;
var offset_hand_angle = 5;
var offset_hand_upper_angle = 0;

const STATE_HAND_LOWER_UP = 0;
const STATE_HAND_LOWER_DOWN = 3;
const STATE_HAND_UPPER_UP = 1;
const STATE_HAND_UPPER_DOWN = 2;
var hand_state = STATE_HAND_LOWER_UP;

var theta = {
    "body" : 45 ,
    "head" : -90,
    "leg"  : 0 ,
    "hand_lower" : 0,
    "hand_upper" : 0,
    "hat" : 0,
    "antenna" : 0
}

var size = {
    "body": [2.0, 5.0, 2.0],
    "head": [3.0, 3.0, 3.0],
    "leg" : [1.0, 3.0, 0.2],
    "hand_lower" : [2.0, 1.0, 0.2],
    "hand_upper" :  [1.5, 1.0, 0.2],
    "hat" : [1, 0.5, 0.5],
    "antenna" : [3, 0.5, 0.5],
    "car_head":[3.0, 3.0, 3.0]
}

var vertices = [
    vec4(-0.5, -0.5, 0.5, 1.0),
    vec4(-0.5, 0.5, 0.5, 1.0),
    vec4(0.5, 0.5, 0.5, 1.0),
    vec4(0.5, -0.5, 0.5, 1.0),
    vec4(-0.5, -0.5, -0.5, 1.0),
    vec4(-0.5, 0.5, -0.5, 1.0),
    vec4(0.5, 0.5, -0.5, 1.0),
    vec4(0.5, -0.5, -0.5, 1.0)
];


function quad(a, b, c, d) {
    var t1 = subtract(vertices[b], vertices[a]);
    var t2 = subtract(vertices[c], vertices[b]);
    var normal = cross(t1, t2);
    var normal = vec3(normal);

    position.push(vertices[a]);
    normals.push(normal);
    position.push(vertices[b]);
    normals.push(normal);
    position.push(vertices[c]);
    normals.push(normal);
    position.push(vertices[a]);
    normals.push(normal);
    position.push(vertices[c]);
    normals.push(normal);
    position.push(vertices[d]);
    normals.push(normal);
}

function setCube() {
    quad(1, 0, 3, 2);
    quad(2, 3, 7, 6);
    quad(3, 0, 4, 7);
    quad(6, 5, 1, 2);
    quad(4, 5, 6, 7);
    quad(5, 4, 0, 1);
}

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    gl.viewport(0, 0, canvas.width, canvas.height);

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    gl.clearColor(0.7, 0.7, 0.7, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);

    setCube();

    //Insert position to vertex shader
    var positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(position), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    //Insert normal to vNormal
    var normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    //Get Normal Matrix Location
    normalLoc = gl.getUniformLocation(program, "normalMatrix");

    //Get Model View Matrix Location
    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");


    //Projection Matrix SetUp
    var projectionMatrix = ortho(-10, 10, -10, 10, -10, 10);
    var projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix")
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    render();

}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    resetModelViewMatrix()

    body();
    leg1();
    leg2();
    drawHand();
    drawTop();

    changeState();
    requestAnimationFrame(render);
}

function changeState(){
  if (hand_state == STATE_HAND_LOWER_UP && theta.hand_lower >= 75){
    offset_hand_angle = 0;
    offset_hand_upper_angle = 5;
    hand_state = STATE_HAND_UPPER_UP;
  } else if (hand_state == STATE_HAND_UPPER_UP && theta.hand_upper >= 75){
    offset_hand_angle = 0;
    offset_hand_upper_angle = -5;
    hand_state = STATE_HAND_UPPER_DOWN;
  } else if (hand_state == STATE_HAND_UPPER_DOWN && theta.hand_upper <= -75){
    offset_hand_angle = -5;
    offset_hand_upper_angle = 0;
    hand_state = STATE_HAND_LOWER_DOWN;
  } else if (hand_state == STATE_HAND_LOWER_DOWN && theta.hand_lower <= -75){
    offset_hand_angle = 5;
    offset_hand_upper_angle = 0;
    hand_state = STATE_HAND_LOWER_UP;
  }
}

function drawHand(){
  theta.hand_lower += offset_hand_angle;
  theta.hand_upper += offset_hand_upper_angle;

  handLowerLeft();
  handUpperLeft();
  popMatrix();
  handLowerRight();
  handUpperRight();
  popMatrix();
}

function drawTop(){
  head();
  hat();
  antenna();
  popMatrix();
}

function resetModelViewMatrix(){
  modelViewMatrix = [rotate(theta.body, 0, 1, 0)];
}

function currentMatrix(){
  return modelViewMatrix[modelViewMatrix.length-1];
}

function popMatrix(){
  return modelViewMatrix.pop();
}

function body() {
    var s = scalem(size.body[0], size.body[1], size.body[2]);
    var instanceMatrix = mult( translate(0, 0, 0.0 ), s);
    var t = mult(currentMatrix(), instanceMatrix);

    draw(t);
}

function head() {
    // theta.head += 5;
    var newModelViewMatrix = mult(currentMatrix(), translate(0, 0.5*size.body[1], 0.0));
    newModelViewMatrix = mult(newModelViewMatrix, rotate(theta.head, 0, 1, 0 ));

    modelViewMatrix.push(newModelViewMatrix)

    var s = scalem(size.head[0], size.head[1], size.head[2]);
    var instanceMatrix = mult(currentMatrix(), translate(0.0, 0.0, 0.0));
    instanceMatrix = mult(instanceMatrix, s)

    draw(instanceMatrix);
}

function hat() {
    var newModelViewMatrix = mult(currentMatrix(), translate(0.7*size.head[1], 0.0, 0.0));
    newModelViewMatrix = mult(newModelViewMatrix, rotate(theta.hat, 0, 0, 1 ));

    modelViewMatrix.push(newModelViewMatrix)

    var s = scalem(size.hat[0], size.hat[1], size.hat[2]);
    var instanceMatrix = mult(currentMatrix(), translate(0.0, 0.0, 0.0));
    instanceMatrix = mult(instanceMatrix, s);

    draw(instanceMatrix);
}

function antenna(){
  theta.antenna += 5;
  var s = scalem(size.antenna[0], size.antenna[1], size.antenna[2]);
  var instanceMatrix = mult(currentMatrix(), translate(0.5*size.antenna[0], 0.0, 0.0));
  instanceMatrix = mult(instanceMatrix, rotate(theta.antenna, 1, 1, 1))
  instanceMatrix = mult(instanceMatrix, s)

  draw(instanceMatrix);
}

function leg1() {
    var s = scalem(size.leg[0], size.leg[1], size.leg[2]);
    var instanceMatrix = mult(currentMatrix(), translate(-0.7*size.body[0], -0.7*size.body[1], 0.0));
    instanceMatrix = mult(instanceMatrix, rotate(theta.leg, 0, 0, 1))
    instanceMatrix = mult(instanceMatrix, s)

    draw(instanceMatrix);
}

function leg2() {
    var s = scalem(size.leg[0], size.leg[1], size.leg[2]);
    var instanceMatrix = mult(currentMatrix(), translate(0.7*size.body[0], -0.7*size.body[1], 0.0));
    instanceMatrix = mult(instanceMatrix, rotate(theta.leg, 0, 0, 1))
    instanceMatrix = mult(instanceMatrix, s)

  draw(instanceMatrix);
}

function handLowerLeft() {
    var newModelViewMatrix = mult(currentMatrix(), translate(-size.body[0], 0.0, 0.0));
    newModelViewMatrix = mult(newModelViewMatrix, rotate(theta.hand_lower, 0, 0, 1 ));

    modelViewMatrix.push(newModelViewMatrix)

    var s = scalem(size.hand_lower[0], size.hand_lower[1], size.hand_lower[2]);

    var instanceMatrix = mult(currentMatrix(), translate(-0.5*size.hand_lower[0], 0.0, 0.0));
    instanceMatrix = mult(instanceMatrix, s)

    draw(instanceMatrix);
}

function handLowerRight() {
    var newModelViewMatrix = mult(currentMatrix(), translate(size.body[0], 0.0, 0.0));
    newModelViewMatrix = mult(newModelViewMatrix, rotate(theta.hand_lower, 0, 0, 1 ));

    modelViewMatrix.push(newModelViewMatrix)

    var s = scalem(size.hand_lower[0], size.hand_lower[1], size.hand_lower[2]);

    var instanceMatrix = mult(currentMatrix(), translate(0.5*size.hand_lower[0], 0.0, 0.0));
    instanceMatrix = mult(instanceMatrix, s)

    draw(instanceMatrix);
}

function handUpperLeft() {
    var s = scalem(size.hand_upper[0], size.hand_upper[1], size.hand_upper[2]);
    var instanceMatrix = mult(currentMatrix(), translate(-2*size.hand_upper[0], 0.0, 0.0));
    instanceMatrix = mult(instanceMatrix, rotate(theta.hand_upper, 0, 0, 1))
    instanceMatrix = mult(instanceMatrix, s)

    draw(instanceMatrix);
}


function handUpperRight() {
    var s = scalem(size.hand_upper[0], size.hand_upper[1], size.hand_upper[2]);
    var instanceMatrix = mult(currentMatrix(), translate(2*size.hand_upper[0], 0.0, 0.0));
    instanceMatrix = mult(instanceMatrix, rotate(theta.hand_upper, 0, 0, 1))
    instanceMatrix = mult(instanceMatrix, s)

  draw(instanceMatrix);
}


function train() {
    carHead();
    carBody();

}

function carHead() {
    var s = scalem(size.car_head[0], size.car_head[1], size.car_head[2])
    var instanceMatrix = mult(translate(2*))
    draw();
}

function carBody() {
    for(var i=0;i<4;i++) {
        carSingle(i);
    }
}

function carSingle(x) {
    modelViewMatrix = scalem(3, x, 3);
    modelViewMatrix = mult(modelViewMatrix, translate(-x, 0.0, -x));
    modelViewMatrix = mult(modelViewMatrix, rotate(0, 1, 0, 0));
    draw();
}

function draw(matrix) {
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(matrix));
    var normalMatrix = inverse(matrix);
    gl.uniformMatrix4fv(normalLoc, false, flatten(normalMatrix));
    gl.drawArrays(gl.TRIANGLES, 0, 36);
}
