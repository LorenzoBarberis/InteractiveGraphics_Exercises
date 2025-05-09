function GetModelViewProjection(projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY) {
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

    // Final projection
    return MatrixMult(projectionMatrix, modelView);
}


// Vertex shader source code
var meshVS = `
    attribute vec3 aPosition;
    attribute vec2 aTexCoord;
    uniform mat4 uModelViewProjection;
    uniform bool uSwapYZ;
    varying vec2 vTexCoord;
    varying float vDepth;
    
    void main() {
        vec3 pos = aPosition;
        if (uSwapYZ) {
            pos = vec3(pos.x, pos.z, pos.y);
        }
        gl_Position = uModelViewProjection * vec4(pos, 1.0);
        vTexCoord = aTexCoord;
        vDepth = gl_Position.z;
    }
`;

// Fragment shader source code
var meshFS = `
    precision mediump float;
    varying vec2 vTexCoord;
    varying float vDepth;
    uniform sampler2D uTexture;
    uniform bool uShowTexture;
    
    void main() {
        if (uShowTexture) {
            gl_FragColor = texture2D(uTexture, vTexCoord);
        } else {
            // Depth-based coloring when texture is disabled
            gl_FragColor = vec4(1.0, vDepth*vDepth, 0.0, 1.0);            
        }
    }
`;

class MeshDrawer {
    constructor() {
        this.swap = false;
        this.showTexture = true;
        this.texture = null;

        // Initialize shader program
        this.prog = InitShaderProgram(meshVS, meshFS);
        gl.useProgram(this.prog);

        // Get attribute locations
        this.vertPosLoc = gl.getAttribLocation(this.prog, "aPosition");
        this.texCoordLoc = gl.getAttribLocation(this.prog, "aTexCoord");

        // Get uniform locations
        this.mvpLoc = gl.getUniformLocation(this.prog, "uModelViewProjection");
        this.swapYZLoc = gl.getUniformLocation(this.prog, "uSwapYZ");
        this.showTextureLoc = gl.getUniformLocation(this.prog, "uShowTexture");
        this.textureLoc = gl.getUniformLocation(this.prog, "uTexture");

        // Create buffers
        this.vertexBuffer = gl.createBuffer();
        this.texCoordBuffer = gl.createBuffer();
        
        // Initialize texture
        this.initTexture();
        
        this.numTriangles = 0;
    }

    initTexture() {
        // Create and configure texture
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        
        // Set texture parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        
        // Initialize with default white texture
        const whitePixel = new Uint8Array([255, 255, 255, 255]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, whitePixel);
    }

    setMesh(vertPos, texCoords) {
        // Store vertex data in buffers
        this.numTriangles = vertPos.length / 3;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
    }

    setTexture(image) {
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
    }

    swapYZ(swap) {
        this.swap = swap;
    }

    showTexture(show) {
        this.showTexture = show;
    }

    draw(mvp) {
        gl.useProgram(this.prog);

        // Set transformation uniforms
        gl.uniformMatrix4fv(this.mvpLoc, false, mvp);
        gl.uniform1i(this.swapYZLoc, this.swap ? 1 : 0);
        gl.uniform1i(this.showTextureLoc, this.showTexture ? 1 : 0);
        
        // Bind texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(this.textureLoc, 0);

        // Set up vertex attributes
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.enableVertexAttribArray(this.vertPosLoc);
        gl.vertexAttribPointer(this.vertPosLoc, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.enableVertexAttribArray(this.texCoordLoc);
        gl.vertexAttribPointer(this.texCoordLoc, 2, gl.FLOAT, false, 0, 0);

        // Draw the mesh
        gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);
    }
}

// Helper function for matrix multiplication
function MatrixMult(A, B) {
    var C = [];
    for (var i = 0; i < 4; ++i) {
        for (var j = 0; j < 4; ++j) {
            var v = 0;
            for (var k = 0; k < 4; ++k) {
                v += A[j + 4 * k] * B[k + 4 * i];
            }
            C.push(v);
        }
    }
    return C;
}
