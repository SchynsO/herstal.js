/**
Base class for all characters
@class Character
*/
class Character {
	/**
	Create a character for the player at the given position
	@constructor
	@param {Player} player   Player which will be represented by the character
	@param {Vec3}   position Foot position of the character
	@param {Number} orientation Angle of the character at start
	@param {Object} options Optional configurations
	@param {Number} options.health The health of the character
	@param {Number} options.maxHealth The maximum health of the character (if < 0, no capping)
	@param {Number} options.armor The armor of the character (if null, no armor)
	@param {Number} options.maxArmor The maximum armor of the character (if null, no capping)
	@param {Number} options.moveSpeed The speed of the character when walking
	@param {Number} options.crounchSpeed The speed of the character when crounched
	@param {Number} options.jumpForce The force applied to the character when jumping
	@param {Number} options.mass The mass of the character
	@param {Number} options.fullWidth The width of the character
	@param {Number} options.fullHeight The full height of the character when standing up
	@param {Number} options.fullCrounched The full height of the character when crounched
	@param {Number} options.bodyWidth The width of the character
	@param {Number} options.bodyHeight The height of the body part of the character when standing up
	@param {Number} options.bodyCrounched The height of the body part of the character when crounched
	@param {Number} options.headWidth The width of the head part of the character
	@param {Number} options.headHeight The height of the head part of the character
	@param {String} options.team
		The team identificator of the character ("none", "alpha", "beta")
		Also set automatically filterGroup and filterMask
	@param {Number} options.filterGroup Override the character filterGroup
	@param {Number} options.filterMask Override the character filterMask
	@param {Boolean} options.noHead Tells if the head part should have the isHead property
	*/
	constructor(player, position, orientation, weapons, options){
		options = options || {};

		// id of the character for online identification
		this.id = null;
		// the world in which the character exists
		this.world = null;

		// the player controlling the character
		this.player = player;
		this.inputs = null;
		// weapons of the character (max should be 10)
		// the array needs atleast one weapon
		this.weapons = weapons || [new Weapon("none", this)];
		this.currentWeapon = 0;

		// characterRender used in HERSTAL.client
		this.render = null;

		// status of the character
		this.health    = options.health    || 100;
		this.maxHealth = options.maxHealth || 100;
		this.armor     = options.armor;
		this.maxArmor  = options.maxArmor;
		this.isDead    = false;
		// movement of the character
		this.moveSpeed    = options.moveSpeed    || 20;
		this.crounchSpeed = options.crounchSpeed || 10;
		this.jumpForce    = options.jumpForce    || 30;

		// we set the dimensions of the character
		var hw = options.headWidth, hh = options.headHeight,
		    fw = options.fullWidth, fh = options.fullHeight,
		    bw = options.bodyWitdh, bh = options.bodyHeight,
			fc = options.fullCrounched, bc = options.bodyCrounched;
		// if no dimensions are set, we use the default values
		hw = hw > 0 ? hw : 0.6;
		hh = hh > 0 ? hh : 0.4;
		// is full height setted ?
		if(fh > 0) fh -= hh;
		if(hc > 0) fc -= hh;
		// either use body or full dimensions
		bw = bw || fw;
		bh = bh || fh;
		bc = bc || fc;
		// we correct the body dimensions
		bw = bw > 0 ? bw : 0.8;
		bh = bh > 0 ? bh : 1.4;
		bc = bc > 0 ? bc : 0.6;
		// we add those information to the character
		this.headWidth     = hw;
		this.headHeight    = hh;
		this.bodyWidth     = bw;
		this.bodyHeight    = bh;
		this.bodyCrounched = bc;
		// we store vertices for ground and ceiling check
		this.vertices = [
			{ x:   0, z:   0 },
			{ x:  bw, z:  bw },
			{ x:  bw, z: -bw },
			{ x: -bw, z:  bw },
			{ x: -bw, z: -bw }
		];
		// mass of the character
		var mass = options.mass || 10;
		// position of the new character
		position = position || { x: 0, y: 0, z: 0 };
		// the origin of the character will be placed at neck level
		position.y += this.bodyHeight;

		// the orientation of the head (not a quaternion)
		this.orientation = { x: orientation || 0, y: 0 };

		// state of the character
		this.isGounded   = false;
		this.isCrounched = false;
		// jump timer gives a time interval in which the character can jump
		this.jumpTimer = 0;
		// contains the information about the platform we are standing on
		this.platform = null; // only requiered for moving platforms

		// relative position of the shapes of the character
		var head_pos = { x: 0, z: 0, y:  0.5 * hh };
		var body_pos = { x: 0, z: 0, y: -0.5 * bh };
		// shapes of the character
		var head_shape = new CANNON.Box({ x: hw, y: hh, z: hw });
		var body_shape = new CANNON.Box({ x: bw, y: bh, z: bw });

		// we recover the filter based on the team of the player
		var team = options.team || "none";
		// should we use self_ group and mask ?
		var isSelf = this.player.current ? "self_" : "";
		var filter = Character.FILTERS[isSelf+team] || Character.FILTERS.none;
		var fg = options.filterGroup, fm = options.filterMask;
		fg = fg != null ? fg : filter.group;
		fm = fm != null ? fm : filter.mask ;

		// we create the body collider of the character
		this.body = new CANNON.Body({
			mass: mass,
			position: position,
			material: Character.MATERIAL,
			fixedRotation: true,
			collisionFilterGroup: fg,
			collisionFilterMask:  fm,
		});
		// we add both shapes to the body
		this.body.addShape(body_shape, body_pos); // shape 0 = body
		this.body.addShape(head_shape, head_pos); // shape 1 = head

		// we add more information to the bodies
		this.body.character = this; // a reference to the character
		if(!options.noHead) head_shape.isHead = true; // this shape is the head
	}

	/* SETTER GETTER */

	/**
	Store all of the inputs set over JSON
	@method setFromInput
	@param {Object} inputs   Inputs loaded from JSON
	@param {Vec2}   inputs.o Orientation of the character
	@param {Vec2}   inputs.m Movement of the character
	@param {Number} inputs.i Array of bits:
		[0] jump
		[1] crounch
		[2] fire1
		[3] fire2
		[4] use
		[5] reload
		[6] melee
		[7] zoom
	@param {Number} inputs.w Weapon selection
	*/
	setFromInput(inputs){
		// if inputs is empty, there is nothing to do
		if(typeof inputs !== "object") return;
		this.inputs = {};

		this.inputs.orientation = inputs.o;
		this.inputs.movement    = inputs.m;
		this.inputs.jump    = !!(inputs.i &        0b1);
		this.inputs.crounch = !!(inputs.i &       0b10);
		this.inputs.fire1   = !!(inputs.i &      0b100);
		this.inputs.fire2   = !!(inputs.i &     0b1000);
		this.inputs.use     = !!(inputs.i &    0b10000);
		this.inputs.reload  = !!(inputs.i &   0b100000);
		this.inputs.melee   = !!(inputs.i &  0b1000000);
		this.inputs.zoom    = !!(inputs.i & 0b10000000);
		this.inputs.weapon  = inputs.w;
	}
	/**
	Set all of the position and movement of the character from the data object
	@method setFromData
	@param {Object} data   Data setting the state of the character
	@param {Vec2}   data.o Orientation of the character
	@param {Vec3}   data.p Position of the character
	@param {Vec3}   data.v Velocity of the character
	@param {Number} data.i Array of bits:
		[0] is grounded
		[1] is crounched
		[2] is jumping
		[3] is firing
		[4] is reloading
	*/
	setFromData(data){
		// if data is empty, there is nothing to do
		if(typeof data !== "object") return;
		// we update the orientation of the character
		this.setLook(data.o);

		// if the position is set
		if(Util.isVector3(data.p)){
			this.body.position.copy(data.p);
		}
		// if the velocity is set
		if(Util.isVector3(data.v)){
			this.body.velocity.copy(data.v);
		}
		// set the state of the character
		/*jshint eqnull: true*/
		if(data.i != null){
			this.isGrounded  = !!(data.i &  0b1);
			this.isCrounched = !!(data.i & 0b10);
		}
	}
	/**
	Read all of the position and movement of the character
	and create a object out of them
	*/
	getData(){
		return {
			o : this.orientation,
			p : {
				x : this.body.position.x,
				y : this.body.position.y,
				z : this.body.position.z,
			},
			v : {
				x : this.body.velocity.x,
				y : this.body.velocity.y,
				z : this.body.velocity.z,
			},
			g  : this.isGrounded,
			c : this.isCrounched,
		};
	}

	/* UPDATE FUNCTIONS */

	/**
	Global update function of the character
	*/
	update(){
		var inputs = this.inputs || {};

		// where the character is looking at ?
		this.setLook(inputs.orientation);
		// is the character on the ground ?
		this.updateGround();
		// in which direction the character is moving, is he jumping ?
		this.updateMove(inputs.movement, inputs.jump);
		// is the character crounching ?
		this.updateCrounch(inputs.crounch);
		// if the character is on a platform, we should record it's position
		this.updatePlatform();
		// we update the weapon the character is holding
		this.setWeapon(inputs.weapon);
	}
	/**
	Allow the character to look around
	calculation based on mouse delta is performed client side
	*/
	setLook( orientation ){
		// if orientation is set
		if(orientation){
			var PI2 = Math.PI*2, hPI = Math.PI*0.5;
			// we keep angle in the [ -2PI, 2PI ] interval
			orientation.x %= PI2;
			orientation.y %= PI2;
			// we cap the angle on the Y-axis within [ -PI/2, PI/2 ] interval
			     if(orientation.y >  hPI) orientation.y =  hPI;
			else if(orientation.y < -hPI) orientation.y = -hPI;
			// we apply the orientation
			this.orientation = orientation;
		}
	}
	/**
	Allow to add more rotation to the character on the Y-axis
	*/
	addRotation( angle ){
		// we add the angle on the Y-axis
		this.orientation.x += angle;
		this.orientation.x %= Math.PI*2;
	}
	/**
	Allow the character to move around
	Movement calculation is performed both client and server side
	server has the authority over the client
	*/
	updateMove( axis, jump ){
		// if axis is not set, we set it to vector null
		axis = axis || {x: 0, y: 0};

		// we normalize the vector to avoid cheating
		var sqrLength = axis.x*axis.x + axis.y*axis.y;
		if( sqrLength > 1 ){
			var length = Math.sqrt(sqrLength);
			axis.x /= length;
			axis.y /= length;
		}

		// we need the angle on the x axis (horizontal plane)
		var theta = this.orientation.x;
		var speed = this.isCrounched ? this.crounchedSpeed : this.moveSpeed;

		// we create a new velocity vector
		var velocity = {
			y: this.body.velocity.y,
			x: (  axis.x*Math.cos(theta) -axis.y*Math.sin(theta) ) * speed,
			z: ( -axis.x*Math.sin(theta) -axis.y*Math.cos(theta) ) * speed
		};

		// if the player pressed the jump input
		if(jump) this.jumpTimer = Character.JUMP_TIMER;

		// if the jump timer is set, we decreament it
		if( this.jumpTimer > 0 ) --this.jumpTimer;

		// if the character is on the ground
		if( this.isGrounded ){
			// if the character wants to jump
			if( this.jumpTimer > 0 ){
				// we reset the timer, the character jumps once
				this.jumpTimer = 0;
				// we apply a vertical velocity
				velocity.y = this.jumpForce;
			}
		}else{
			// in the air, the new velocity is influenced by the old one
			// new_vel = new_vel/2 + old_vel/2;
			velocity.x += this.body.velocity.x;
			velocity.z += this.body.velocity.z;
			velocity.x *= 0.5;
			velocity.z *= 0.5;
		}
		this.body.velocity = velocity;
	}
	/**
	Function to know if the character is on the ground or not
	*/
	updateGround(){
		// we reset the state of the character
		this.isGrounded = false;
		// we try each vertices we have defined for characters
		for( var i=0; i<this.dimensions.vertices.length; ++i ){

			// for each vertice, we move it from local to global coords
			var vert = this.body.vadd( this.dimensions.vertices[i] );
			// we put the vertice at the base of the body shape
			vert.y -= this.body.shapes[0].halfExtents.y * 2; // shape 0 is body

			// we recover the result of the contact with the ground
			var result = Character.checkCollision(this.body.world, vert, -0.1);
			if(result.hasHit){

				// the angle between the surface normal and the vector up
				var angle = result.hitNormalWorld.getAngle(CANNON.Vec3.UNIT_Y);
				// if the ground on which the character stand is not too steep
				if( angle < Character.STEEP_SLOPE ){

					// we are on a ground
					this.isGrounded = true;
					// if the platform on which we land is kinematic
					if( result.body.type === CANNON.Body.KINEMATIC ){

						// did we changed of platform ?
						var hasChanged = false;
						if(!platform) hasChanged = true;
						else if(platform.body !== result.body) hasChanged = true;
						// if the platform has changed
						if(hasChanged){
							// we need to update the platform
							this.platform = { body: result.body };
							this.updatePlatform();
						}
					}else{
						// we landed on a platform which is not kinematic
						this.platform = null;
					}
					// we've found one contact point
					return; // we don't need to check the others
				}
			}
		}
		this.platform = null;
	}
	/**
	Update the position of the character based on
	the position of the moving platform he is standing on
	/!\ Should be called after physic engine calculations /!\
	*/
	updatePlatformPosition(){
		var p = this.platform;
		if(p){ // if the character is standing on a platform

			// we calculate the movement of the platform since the last update
			var newGlobalPos = p.pointToWorldFrame(p.localPos);
			var translation  = newGlobalPos.vsub(p.globalPos);
			// we apply the movement to the player
			this.body.position = this.body.position.vadd(translation);

			// we calculate the rotation of the platform since the last update
			var newGlobalRot = p.body.quaternion.mult(p.localRot);
			var rotationDiff = newGlobalRot.mult(p.globalRot.inverse());
			// the character body cannot rotate because fixedRotation=true
			var vec = {};
			rotationDiff.toEuler(vec);
			// we add the rotation to the horizontal plane
			this.addRotation(vec.y);
		}
	}
	/**
	Update the local position and orientation of the character
	relative to the platform
	*/
	updatePlatform(){
		if(this.platform){ // if the platform is not null
			// position of the platform
			this.platform.globalPos = this.body.position.clone();
			this.platform.localPos  = this.platform.body.
				pointToLocalFrame(this.platform.globalPos);
			// orientation of the platform
			this.platform.globalRot = this.body.quaternion.clone();
			this.platform.localRot  = this.platform.body.quaternion.inverse().
				mult(this.platform.globalRot);
		}
	}
	/**
	Function to manage character height and crounching
	*/
	updateCrounch(crounch){
		var canGetUp = true;
		if(crounch){
			canGetUp = false;
			this.isCrounched = true;
		}else if(this.isCrounched){
			// we try each vertices we have defined for characters
			// as long as canGetUp is not false
			for( var i=0; i<this.dimensions.vertices.length && canGetUp; ++i ){

				// for each vertice, we move it from local to global coords
				var vert = this.body.vadd( this.dimensions.vertices[i] );
				// we put the vertice at the top of the head shape
				vert.y += this.headHeight;

				// we recover the result of the contact with the ground
				var result = Character.checkCollision(this.body.world, vert, 0.1);
				if(result.hasHit) canGetUp = false;
			}
		}

		// we recover the shape and the offset
		var shape  = this.body.shapes[0];
		var offset = this.body.shapeOffsets[0];
		var inc = Character.CROUNCH_INCREMENT;
		var h;
		// if the character can stand up
		if(canGetUp){
			// as long as we are not fully standing up
			if( shape.halfExtents.y*2 < this.bodyHeight ){
				// we increase the size of the shape
				shape.halfExtents.y += inc*2;
				// we bring the shape closer to the the origin
				offset.y -= inc;

				// if we have a shape bigger than expected
				if( shape.halfExtents.y*2 >= this.bodyHeight ){
					h = this.bodyHeight * 0.5;
					// we cap the values
					shape.halfExtents.y = h;
					offset.y = -h;
					// the character is no longer crounched
					this.isCrounched = false;
				}
			}
		}else{ // cannot stand up
			// as long as we are not fully crounched
			if( shape.halfExtents.y*2 > this.bodyCrounched ){
				// we decrease the size of the shape
				shape.halfExtents.y -= inc*2;
				// we put the shape farther from the origin
				offset.y += inc;

				// if we have a shape smaller than expected
				if( shape.halfExtents.y*2 < this.bodyCrounched ){
					h = this.bodyCrounched * 0.5;
					// we cap the values
					shape.halfExtents.y = h;
					offset.y = -h;
				}
			}
		}
	}

	setWeapon( index ){
		// if the weapons array is empty
		// or we haven't specified a weapon to switch to
		// there is nothing to do
		if(this.weapons.length === 0 && index == null) return;
		// what will be the new weapon of the player ?
		var newWeap = this.currentWeapon;
		// if index is positive
		if( -1 < index && index < this.weapons.length ){
			// if a weapon exists at the index position
			if( this.weapons[index] != null ){
				// we set the weapon
				newWeap = index;
			}
		}else{
			// if index==-1 : previous weapon, if index==-2 : next weapon
			var incre = index == -1 ? -1 : +1;
			// we loop weapons.length times at max to avoid endless loop
			for(var i=0, stop=false; i<this.weapons.length || stop; ++i){
				// we increament or decreament the value
				newWeap += incre;
				// we cap the value
				if(newWeap >= this.weapons.length) newWeap = 0;
				else if(newWeap < 0) newWeap = this.weapons.length -1;
				// if we found a weapon which is not null, we stop the loop
				if(this.weapons[newWeap] != null) stop = true;
			}
		}

		// we call the necessary functions to update the display in HERSTALclient

		// we can store the new weapon as the current weapon now
		this.currentWeapon = newWeap;
	}

	addDamage(damage){
		// if the character as some armor
		if( this.armor > 0 ){
			var armorDamage = damage * Character.ARMOR_PROTECTION;
			damage     -= armorDamage; // we reduce the overall damage
			this.armor -= armorDamage; // we apply damage to the armor
			// if there was more damage than expected
			if(this.armor < 0){
				// we apply the difference
				damage -= this.armor;
				this.armor = 0;
			}
		}
		this.health -= damage;
		// if health reach 0, the character is dead
		if(this.health <= 0) this.isDead = true;
	}

	addHealth(health){
		this.health += health;
		// if health is higher than max
		if(this.health > this.maxHealth && this.maxHealth > 0)
			this.health = this.maxHealth; // we cap the value
	}

	addArmor(armor){
		if(this.armor != null){
			this.armor += armor;
			// if armor is higher than max and max not null
			if(this.armor > this.maxArmor && this.maxArmor != null)
				this.armor = this.maxArmor; // we cap the value
		}
	}

	killed(callback){
		callback();
	}



}
HERSTAL.Character = Character;

/**
cast rays from the given vertice with a length of padding
@method checkCollision
@param {World} world The cannon.js world to cast rays in
@param {Object} vertice The point in 3D space to cast the ray from
@param {Number} padding The direction and length of the ray on the y-axis
*/
Character.checkCollision = function( world, vertice, padding = 0.1 ){
	// we create the starting and ending points of the rays
	var from = new CANNON.Vec3( vertice.x, vertice.y, vertice.z );
	var to   = from.vadd({y: padding});
	var ray  = new CANNON.Ray( from, to );

	// we check collision with the world
	ray.intersectWorld(world, {
		mode: Ray.CLOSEST,
		skipBackfaces: true,
		collisionFilterGroup: 0b1,
		collisionFilterMask:  0b1
	});
	// we return the results rather than just hasHit
	return ray.result;
};

// attributes of the character
Character.ARMOR_PROTECTION  = 2/3 ; // number of hit taken by the armor
Character.JUMP_TIMER        = 10  ; // time before registering jumps
Character.CROUNCH_INCREMENT = 0.05; // time between standing and crounching
Character.STEEP_SLOPE       = 50  ; // maximum angle for walking on slopes

/*
bit definition:
	4 : TEAM BETA
	3 : TEAM ALPHA
	2 : NO TEAM
	1 : CHARACTER
	0 : WORLD
*/
// Team definition
Character.FILTERS = {
	none  : { group: 0b00111, mask: 0b00111 }, // NO TEAM
	alpha : { group: 0b01011, mask: 0b01011 }, // TEAM ALPHA
	beta  : { group: 0b10011, mask: 0b10011 }, // TEAM BETA
	self_none  : { group: 0b1, mask: 0b1 },
	self_alpha : { group: 0b1, mask: 0b1 },
	self_beta  : { group: 0b1, mask: 0b1 },
};
