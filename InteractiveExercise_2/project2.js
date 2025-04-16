// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The transformation first applies scale, then rotation, and finally translation.
// The given rotation value is in degrees.
function GetTransform(positionX, positionY, rotation, scale)
{
	let rad = rotation * Math.PI / 180; // gradi → radianti
	let cos = Math.cos(rad);
	let sin = Math.sin(rad);

	// Matrice: T * R * S
	// [ scale*cos  -scale*sin  positionX ]
	// [ scale*sin   scale*cos  positionY ]
	// [    0            0           1    ]

	return [
		scale * cos,  // a
		scale * sin,  // b
		0,            // c

		-scale * sin, // d
		scale * cos,  // e
		0,            // f

		positionX,    // g
		positionY,    // h
		1             // i
	];
}


// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The arguments are transformation matrices in the same format.
// The returned transformation first applies trans1 and then trans2.
function ApplyTransform(t1, t2)
{
	let result = new Array(9);

	for (let row = 0; row < 3; ++row) {
		for (let col = 0; col < 3; ++col) {
			result[col * 3 + row] =
				t2[0 * 3 + row] * t1[col * 3 + 0] +
				t2[1 * 3 + row] * t1[col * 3 + 1] +
				t2[2 * 3 + row] * t1[col * 3 + 2];
		}
	}

	return result;
}

