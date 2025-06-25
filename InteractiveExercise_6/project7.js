// This function takes the translation and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// You can use the MatrixMult function defined in project5.html to multiply two 4x4 matrices in the same format.
function GetModelViewMatrix( translationX, translationY, translationZ, rotationX, rotationY )
{
	// Rotation around X axis
	var cosX = Math.cos(rotationX);
	var sinX = Math.sin(rotationX);
	var rotXMat = [
		1,    0,     0, 0,
		0, cosX, -sinX, 0,
		0, sinX,  cosX, 0,
		0,    0,     0, 1
	];
	// Rotation around Y axis
	var cosY = Math.cos(rotationY);
	var sinY = Math.sin(rotationY);
	var rotYMat = [
		cosY, 0, sinY, 0,
		0,    1,    0, 0,
		-sinY,0, cosY, 0,
		0,    0,    0, 1
	];
	// Translation
	var transMat = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		translationX, translationY, translationZ, 1
	];
	// Combine: T * RY * RX
	var mv = MatrixMult(transMat, MatrixMult(rotYMat, rotXMat));
	return mv;
}

class MeshDrawer {
	constructor() {
		this.prog = InitShaderProgram(this.vsSource(), this.fsSource());
		this.swapYZValue = false;
		this.showTextureValue = true;
		this.texture = gl.createTexture();
		this.numTriangles = 0;
		this.vertBuffer = gl.createBuffer();
		this.texBuffer = gl.createBuffer();
		this.normBuffer = gl.createBuffer();
		// Get attribute/uniform locations
		this.aPos = gl.getAttribLocation(this.prog, "pos");
		this.aTex = gl.getAttribLocation(this.prog, "texCoord");
		this.aNorm = gl.getAttribLocation(this.prog, "normal");
		this.uMVP = gl.getUniformLocation(this.prog, "mvp");
		this.uMV = gl.getUniformLocation(this.prog, "mv");
		this.uNormTrans = gl.getUniformLocation(this.prog, "normTrans");
		this.uSwapYZ = gl.getUniformLocation(this.prog, "swapYZ");
		this.uShowTexture = gl.getUniformLocation(this.prog, "showTexture");
		this.uLightDir = gl.getUniformLocation(this.prog, "lightDir");
		this.uShininess = gl.getUniformLocation(this.prog, "shininess");
	}

	vsSource() {
		return `
		attribute vec3 pos;
		attribute vec3 normal;
		attribute vec2 texCoord;
		uniform mat4 mvp;
		uniform mat4 mv;
		uniform mat3 normTrans;
		uniform bool swapYZ;
		varying vec3 vNormal;
		varying vec3 vPos;
		varying vec2 vTexCoord;
		void main() {
			vec3 p = pos;
			vec3 n = normal;
			if (swapYZ) {
				p = vec3(p.x, p.z, p.y);
				n = vec3(n.x, n.z, n.y);
			}
			vNormal = normalize(normTrans * n);
			vPos = vec3(mv * vec4(p, 1.0));
			vTexCoord = texCoord;
			gl_Position = mvp * vec4(p, 1.0);
		}`;
	}

	fsSource() {
		return `
		precision mediump float;
		varying vec3 vNormal;
		varying vec3 vPos;
		varying vec2 vTexCoord;
		uniform sampler2D textureImage;
		uniform bool showTexture;
		uniform vec3 lightDir;
		uniform float shininess;
		void main() {
			vec3 N = normalize(vNormal);
			vec3 L = normalize(lightDir);
			vec3 V = normalize(-vPos);
			vec3 R = reflect(-L, N);
			float diff = max(dot(N, L), 0.0);
			float spec = pow(max(dot(R, V), 0.0), shininess);
			vec3 baseColor = showTexture ? texture2D(textureImage, vTexCoord).rgb : vec3(0.7, 0.7, 0.7);
			vec3 color = baseColor * diff + vec3(1.0) * spec * 0.5 + baseColor * 0.2;
			gl_FragColor = vec4(color, 1.0);
		}`;
	}

	setMesh(vertPos, texCoords, normals) {
		this.numTriangles = vertPos.length / 3;
		gl.useProgram(this.prog);
		// Vertex positions
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);
		// Texture coordinates
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
		// Normals
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
	}

	swapYZ(swap) {
		this.swapYZValue = swap;
	}

	draw(matrixMVP, matrixMV, matrixNormal) {
		gl.useProgram(this.prog);														// use the shader
		// Set up vertex attributes
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
		gl.enableVertexAttribArray(this.aPos);
		gl.vertexAttribPointer(this.aPos, 3, gl.FLOAT, false, 0, 0);
		// Set up normal buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuffer);
		gl.enableVertexAttribArray(this.aNorm);
		gl.vertexAttribPointer(this.aNorm, 3, gl.FLOAT, false, 0, 0);
		// Set up texture
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
		gl.enableVertexAttribArray(this.aTex);
		gl.vertexAttribPointer(this.aTex, 2, gl.FLOAT, false, 0, 0); // 2 coordinates becaus texture coordinates are 2d (UV)
		// Uniforms
		gl.uniformMatrix4fv(this.uMVP, false, new Float32Array(matrixMVP));  // set the model-view-projection matrix
		gl.uniformMatrix4fv(this.uMV, false, new Float32Array(matrixMV));	 // set the model-view matrix (without projection)
		gl.uniformMatrix3fv(this.uNormTrans, false, new Float32Array(matrixNormal));	// set the normal transformation matrix
		gl.uniform1i(this.uSwapYZ, this.swapYZValue);								    // set the swapYZ uniform
		gl.uniform1i(this.uShowTexture, this.showTextureValue);							// set the showTexture uniform
		gl.activeTexture(gl.TEXTURE0);	 												// activate texture unit 0 (the first available)
		gl.bindTexture(gl.TEXTURE_2D, this.texture);									// bind the texture to the active texture unit
		gl.uniform1i(gl.getUniformLocation(this.prog, "textureImage"), 0);
		// Set default light and shininess if not set
		if (!this.lightDir) this.setLightDir(0, 0, 1);
		if (!this.shininess) this.setShininess(20.0);
		gl.uniform3fv(this.uLightDir, this.lightDir);
		gl.uniform1f(this.uShininess, this.shininess);
		// Draw
		gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);
	}

	setTexture(img) {
		gl.useProgram(this.prog);													// use the shader
		gl.bindTexture(gl.TEXTURE_2D, this.texture);								// choose the texture created in the constructor
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);		// set texture wrapping to clamp to edge
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);		// set texture filtering
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);			// set texture filtering to linear for both minification and magnification
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);			// Upload the texture image data
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);		// set the texture image data (0 is the leve of mipmap)
	}

	showTexture(show) {
		this.showTextureValue = show;
	}

	setLightDir(x, y, z) {
		this.lightDir = new Float32Array([x, y, z]);
	}

	setShininess(shininess) {
		this.shininess = shininess;
	}
}


// This function is called for every step of the simulation.
// Its job is to advance the simulation for the given time step duration dt.
// It updates the given positions and velocities.
function SimTimeStep( dt, positions, velocities, springs, stiffness, damping, particleMass, gravity, restitution )
{
    // Initialize forces array with gravity and global damping for each particle
    var forces = Array( positions.length );												// The total force for each particle
    for (var i = 0; i < forces.length; i++) {
        // F = m*g - damping*v
        forces[i] = gravity.mul(particleMass).sub(velocities[i].mul(damping));			// for each particle, initialize the force with gravity and damping
    }

    // Calculate spring forces
    for (var i = 0; i < springs.length; i++) {
        var spring = springs[i];
        var p0 = spring.p0;						//Get the first particle indices for the spring
        var p1 = spring.p1;						//Get the other particle indices for the spring
        var restLength = spring.rest;			//Get the rest length of the spring between the two particles

        // Calculate current spring vector and length
        var springVec = positions[p1].sub(positions[p0]);		// Vector from p0 to p1
        var currentLength = springVec.len();					// Length of the spring vector
        if (currentLength > 0.0) {								// Avoid division by zero
            var direction = springVec.mul(1.0 / currentLength);	// Normalize the spring vector to get the direction	
            var force = direction.mul(stiffness * (currentLength - restLength));	// Calculate the spring force (elastic force)
            forces[p0].inc(force);					// Apply the force to the first particle
            forces[p1].dec(force);					// Apply the opposite force to the second particle
        }
    }

    // Update velocities and positions (semi-implicit Euler)
    for (var i = 0; i < positions.length; i++) {				// For each particle
        // a = F/m
        var acceleration = forces[i].div(particleMass);			// Calculate acceleration with newton's second law
        velocities[i].inc(acceleration.mul(dt));				// Update velocity with acceleration
        positions[i].inc(velocities[i].mul(dt));				// Update position with velocity
    }

    // Handle collisions with the bounding box (-1 to 1 in all dimensions)
    for (var i = 0; i < positions.length; i++) {						// For each particle
        var p = positions[i];											// Get the position of the particle				
        var v = velocities[i];											// Get the velocity of the particle
        for (var dim = 0; dim < 3; dim++) {								// For each dimension (xyz)
            var coord = dim === 0 ? p.x : (dim === 1 ? p.y : p.z);		// Get the coordinate of the particle in the current dimension
            var vel = dim === 0 ? v.x : (dim === 1 ? v.y : v.z);		// Get the velocity of the particle in the current dimension
            if (coord < -1) {											// If the particle is outside the bounding box in the negative direction
                if (dim === 0) p.x = -1;								// Set the position to the bounding box limit for each dimension
                else if (dim === 1) p.y = -1;
                else p.z = -1;
                if (dim === 0) v.x = -vel * restitution;
                else if (dim === 1) v.y = -vel * restitution;
                else v.z = -vel * restitution;
            }	
            else if (coord > 1) {										// Same of the previous, but for the positive direction
                if (dim === 0) p.x = 1;
                else if (dim === 1) p.y = 1;
                else p.z = 1;
                if (dim === 0) v.x = -vel * restitution;
                else if (dim === 1) v.y = -vel * restitution;
                else v.z = -vel * restitution;
            }
        }
    }
}

