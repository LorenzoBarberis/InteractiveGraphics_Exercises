function GetModelViewMatrix(translationX, translationY, translationZ, rotationX, rotationY) {
    // Rotation around X axis
    var rotX = [
        1, 0, 0, 0,
        0, Math.cos(rotationX), Math.sin(rotationX), 0,
        0, -Math.sin(rotationX), Math.cos(rotationX), 0,
        0, 0, 0, 1
    ];

    // Rotation around Y axis
    var rotY = [
        Math.cos(rotationY), 0, -Math.sin(rotationY), 0,
        0, 1, 0, 0,
        Math.sin(rotationY), 0, Math.cos(rotationY), 0,
        0, 0, 0, 1
    ];

    // Translation
    var trans = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        translationX, translationY, translationZ, 1
    ];

    // Combine transformations: trans * rotY * rotX
    var modelView = MatrixMult(MatrixMult(trans, rotY), rotX);
    return modelView;
}

class MeshDrawer {
    constructor() {
        this.prog = InitShaderProgram(meshVS, meshFS);

        // Attributes
        this.vertPosLoc = gl.getAttribLocation(this.prog, 'aPosition');
        this.texCoordLoc = gl.getAttribLocation(this.prog, 'aTexCoord');
        this.normalLoc = gl.getAttribLocation(this.prog, 'aNormal');

        // Uniforms
        this.mvpLoc = gl.getUniformLocation(this.prog, 'uModelViewProjection');
        this.mvLoc = gl.getUniformLocation(this.prog, 'uModelView');
        this.normalMatrixLoc = gl.getUniformLocation(this.prog, 'uNormalMatrix');
        this.swapYZLoc = gl.getUniformLocation(this.prog, 'uSwapYZ');
        this.showTextureLoc = gl.getUniformLocation(this.prog, 'uShowTexture');
        this.textureLoc = gl.getUniformLocation(this.prog, 'uTexture');
        this.lightDirLoc = gl.getUniformLocation(this.prog, 'uLightDir');
        this.shininessLoc = gl.getUniformLocation(this.prog, 'uShininess');

        // Buffers
        this.vertexBuffer = gl.createBuffer();
        this.texCoordBuffer = gl.createBuffer();
        this.normalBuffer = gl.createBuffer();

        // Texture
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        const whitePixel = new Uint8Array([255, 255, 255, 255]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, whitePixel);

        // State
        this.swap = false;
        this.showTexture = true;
        this.lightDir = [0, 0, 0];
        this.shininess = 1.0;
        this.numTriangles = 0;
    }

    setMesh(vertPos, texCoords, normals) {
        this.numTriangles = vertPos.length / 3;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    }

    swapYZ(swap) {
        this.swap = swap;
    }

    showTexture(show) {
        this.showTexture = show;
    }

    setLightDir(x, y, z) {
        this.lightDir = [x, y, z];
    }

    setShininess(shininess) {
        this.shininess = shininess;
    }

    draw(matrixMVP, matrixMV, matrixNormal) {
        gl.useProgram(this.prog);

        // Set uniforms
        gl.uniformMatrix4fv(this.mvpLoc, false, matrixMVP);
        gl.uniformMatrix4fv(this.mvLoc, false, matrixMV);
        gl.uniformMatrix3fv(this.normalMatrixLoc, false, matrixNormal);
        gl.uniform1i(this.swapYZLoc, this.swap ? 1 : 0);
        gl.uniform1i(this.showTextureLoc, this.showTexture ? 1 : 0);
        gl.uniform3f(this.lightDirLoc, this.lightDir[0], this.lightDir[1], this.lightDir[2]);
        gl.uniform1f(this.shininessLoc, this.shininess);

        // Texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(this.textureLoc, 0);

        // Attributes
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.enableVertexAttribArray(this.vertPosLoc);
        gl.vertexAttribPointer(this.vertPosLoc, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.enableVertexAttribArray(this.texCoordLoc);
        gl.vertexAttribPointer(this.texCoordLoc, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.enableVertexAttribArray(this.normalLoc);
        gl.vertexAttribPointer(this.normalLoc, 3, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);
    }

    setTexture(img) {
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);
    }
}

// Shaders
var meshVS = `
attribute vec3 aPosition;
attribute vec2 aTexCoord;
attribute vec3 aNormal;

uniform mat4 uModelViewProjection;
uniform mat4 uModelView;
uniform mat3 uNormalMatrix;
uniform bool uSwapYZ;

varying vec2 vTexCoord;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
    vec3 pos = aPosition;
    vec3 normal = aNormal;
    if (uSwapYZ) {
        pos = vec3(pos.x, pos.z, pos.y);
        normal = vec3(normal.x, normal.z, normal.y);
    }
    vec4 mvPos = uModelView * vec4(pos, 1.0);
    gl_Position = uModelViewProjection * vec4(pos, 1.0);
    vTexCoord = aTexCoord;
    vNormal = uNormalMatrix * normal;
    vPosition = mvPos.xyz;
}
`;

var meshFS = `
precision mediump float;

varying vec2 vTexCoord;
varying vec3 vNormal;
varying vec3 vPosition;

uniform sampler2D uTexture;
uniform bool uShowTexture;
uniform vec3 uLightDir;
uniform float uShininess;

void main() {
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(uLightDir);
    vec3 viewDir = normalize(-vPosition);

    vec3 Kd = uShowTexture ? texture2D(uTexture, vTexCoord).rgb : vec3(1.0);
    vec3 Ks = vec3(1.0);

    // Ambient
    vec3 ambient = 0.1 * Kd;

    // Diffuse
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = Kd * diff;

    // Specular (Blinn-Phong)
    vec3 halfwayDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfwayDir), 0.0), uShininess);
    vec3 specular = Ks * spec;

    vec3 result = ambient + diffuse + specular;
    gl_FragColor = vec4(result, 1.0);
}
`;
