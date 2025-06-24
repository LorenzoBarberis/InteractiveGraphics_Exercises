var raytraceFS = `
struct Ray {       		//define a ray structure
	vec3 pos;			// ray origin
	vec3 dir;			// ray direction
};

struct Material {
	vec3  k_d;			// diffuse coefficient
	vec3  k_s;			// specular coefficient (how shiniy)
	float n;			// specular exponent (how strongly it reflects)
};

struct Sphere {			//define a sphere structure
	vec3     center;	// sphere center
	float    radius;	// sphere radius
	Material mtl;		// sphere material
};

struct Light {			//define a light structure
	vec3 position;
	vec3 intensity;
};

struct HitInfo {		//impact of the light information
	float    t;			// distance from the origin to the intersection point
	vec3     position;	// intersection point
	vec3     normal;	// normal at the intersection point
	Material mtl;		// material at the intersection point
};

uniform Sphere spheres[ NUM_SPHERES ];
uniform Light  lights [ NUM_LIGHTS  ];
uniform samplerCube envMap;				// environment map for reflections (a cube scene)
uniform int bounceLimit;				// maximum number of bounces for reflections

bool IntersectRay( inout HitInfo hit, Ray ray );			// function to check if a ray intersects with any sphere

vec3 Shade( Material mtl, vec3 position, vec3 normal, vec3 view ) //calculate the color at the intersection point
{
	vec3 color = vec3(0.0); 		// initialize color to black
	for ( int i=0; i<NUM_LIGHTS; ++i ) {  							// Loop through all lights
		Light light = lights[i];									// Calculate one light at a time
		vec3 L = normalize(light.position - position);				// Identify the direction to the light source from the surface	
		float lightDistance = length(light.position - position);	// Convert the normalized vector to a distance
		
		// Shadow ray with increased offset
		Ray shadowRay;													// Create a shadow ray
		shadowRay.pos = position + normal * 0.02; 						// Fixed offset starting from the sufface (but slighyly above it)
		shadowRay.dir = L;												// Direction of the shadow ray towards the light source
		HitInfo shadowHit;		shadowHit.t = 1e30;						// Initialize the shadow hit to collect hitting information
		bool inShadow = false;											// Check if the shadow ray intersects with any sphere
		if (IntersectRay(shadowHit, shadowRay)) {						// If the shadow ray intersects with a sphere
			if (shadowHit.t < lightDistance) {							// If the intersection point is closer than the light source
				inShadow = true;										// The surface is in shadow
			}
		}
		
		if (!inShadow) {												// If the surface is not in shadow, calculate the color
			// Diffuse component
			float diff = max(dot(normal, L), 0.0);						// Ensure the dot product is non-negative and how much light is hitting the surface
			vec3 diffuse = mtl.k_d * diff * light.intensity;			// Calculate the diffuse color according to the material and light intensity
			
			// Specular component (Blinn-Phong)
			vec3 H = normalize(L + view);								// Halfway vector between light direction and view direction
			float spec = pow(max(dot(normal, H), 0.0), mtl.n);			// Ensure the dot product is non-negative and calculate the specular highlight
			vec3 specular = mtl.k_s * spec * light.intensity;			// Calculate the specular color according to the material and light intensity
			
			color += diffuse + specular;								// Add the diffuse and specular components to the color
		}
	}
	return color;
}

bool IntersectRay( inout HitInfo hit, Ray ray )
{
	hit.t = 1e30;
	bool foundHit = false; 										// start with no hits
	for ( int i=0; i<NUM_SPHERES; ++i ) {
		Sphere sphere = spheres[i];								// Ray-sphere intersection test
		vec3 oc = ray.pos - sphere.center;						// Calculate vector from ray origin to sphere center
		float a = dot(ray.dir, ray.dir);						// Calculate the coefficients of the quadratic equation ray-sphere intersection
		float b = 2.0 * dot(oc, ray.dir);
		float c = dot(oc, oc) - sphere.radius * sphere.radius;
		float discriminant = b*b - 4.0*a*c;						// Calculate the discriminant
		if (discriminant < 0.0) continue;						// If the discriminant is negative, there is no intersection
		float sqrtDisc = sqrt(discriminant);					// Calculate the square root of the discriminant
		float t1 = (-b - sqrtDisc) / (2.0*a);					// Calculate the two possible intersection points
		float t2 = (-b + sqrtDisc) / (2.0*a);
		float t = 1e30;
		if (t1 > 0.0) t = t1;									// If t1 is positive, it is a valid intersection
		if (t2 > 0.0 && t2 < t) t = t2;							// If t2 is positive and less than t, it is a valid intersection
		if (t < hit.t) {										// If the intersection point is closer than the previous hit
			hit.t = t;
			hit.position = ray.pos + t * ray.dir;
			hit.normal = normalize(hit.position - sphere.center); // Added normalize
			hit.mtl = sphere.mtl;
			foundHit = true;									// Update the hit information
		}
	}
	return foundHit;
}

vec4 RayTracer( Ray ray )
{
	HitInfo hit;															// Initialize hit information
	if ( IntersectRay( hit, ray ) ) {										// If the ray intersects with a sphere, calculate the color at the intersection point	
		vec3 view = normalize( -ray.dir );									// Corrected view vector calculation (from surface to camera)
		vec3 clr = Shade( hit.mtl, hit.position, hit.normal, view );		// Calculate the color at the intersection point with the shade function
		vec3 k_s = hit.mtl.k_s;												// Get specular coefficient of the material
		
		for ( int bounce=0; bounce<MAX_BOUNCES; ++bounce ) {				// Bounce the ray off the surface (according to the settings)
			if ( bounce >= bounceLimit ) break;								// If the bounce limit is reached, stop bouncing
			if ( k_s.r + k_s.g + k_s.b <= 0.0 ) break;						// If the specular coefficient is zero, stop bouncing (because useless)
			
			Ray r;																		// Create a new ray for the reflection
			r.pos = hit.position + hit.normal * 0.02; // Increased offset			    // Fixed offset starting from the surface (but slightly above it)
			r.dir = normalize(reflect(ray.dir, hit.normal)); 							// Calculate the reflection direction according to the normal surface 
			HitInfo h;																	// Initialize hit information for the reflection ray
			
			if ( IntersectRay( h, r ) ) {												// if the reflection ray intersects with a sphere, it update the color information with the environment map
				vec3 bounceView = normalize( -r.dir );			
				clr += k_s * Shade( h.mtl, h.position, h.normal, bounceView );
				k_s *= h.mtl.k_s;
				hit = h;
				ray = r;
			} else {
				clr += k_s * textureCube( envMap, r.dir.xzy ).rgb;						 // If the reflection ray does not intersect with any sphere, it uses the environment map color
				break;
			}
		}
		return vec4( clr, 1 );				// Final color, without the alpha channel
	} else {
		return vec4( textureCube( envMap, ray.dir.xzy ).rgb, 0 ); // if the ray does not intersect with any sphere, return the environment color witth alpha 0 (transparent)
	}
}
`;