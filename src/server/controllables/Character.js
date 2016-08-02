/**
Base class for all characters
@class Character @extends Controllable
*/
class Character extends HERSTAL.Controllable{
	/**
	Create a character for the player at the given position
	@constructor
	@param {Controller} controller The controller controlling the character
	@param {Vec3}   position Foot position of the character
	@param {Number} orientation Angle of the character at start
	@param {Object} [options] Optional configurations
	@param {Number} [options.health]        The health of the character
	@param {Number} [options.maxHealth]     The maximum health of the character (if < 0, no capping)
	@param {Number} [options.armor]         The armor of the character (if null, no armor)
	@param {Number} [options.maxArmo]       The maximum armor of the character (if null, no capping)
	@param {Number} [options.moveSpeed]     The speed of the character when walking
	@param {Number} [options.crounchSpeed]  The speed of the character when crounched
	@param {Number} [options.jumpForce]     The force applied to the character when jumping
	@param {Number} [options.mass]          The mass of the character
	@param {Number} [options.fullWidth]     The width of the character
	@param {Number} [options.fullHeight]    The full height of the character when standing up
	@param {Number} [options.fullCrounched] The full height of the character when crounched
	@param {Number} [options.bodyWidth]     The width of the character
	@param {Number} [options.bodyHeight]    The height of the body part of the character when standing up
	@param {Number} [options.bodyCrounched] The height of the body part of the character when crounched
	@param {Number} [options.headWidth]     The width of the head part of the character
	@param {Number} [options.headHeight]    The height of the head part of the character
	@param {Number} [options.team]
		The team identificator of the character
		Also set automatically filterGroup and filterMask
	@param {Number} [options.filterGroup] Override the character filterGroup
	@param {Number} [options.filterMask]  Override the character filterMask
	@param {Boolean} [options.noHead]     Tells if the head part should have the isHead property
	*/
	constructor(controller, position, orientation, weapons, options){
		options = options || {};
		super(controller);

		// id of the character for online identification
		this.id = Character.idCounter++;
		// id is not safe anymore
		if(!Number.isSafeInteger(Character.idCounter)){
			// we roll back to the minimal safe ID
			Character.idCounter = Number.MIN_SAFE_INTEGER;
		}

		// weapons of the character (max should be 10)
		this.weapons = weapons || [];
		// if weapon array is null, currentWeapon is null
		this.currentWeapon = this.weapons.length>0 ? 0 : null;

		// status of the character
		this.health    = options.health    || 100;
		this.maxHealth = options.maxHealth || 100;
		this.armor     = options.armor;
		this.maxArmor  = options.maxArmor;
		this.isDead    = false; // the character is not dead yet
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
		var filter = TEAM.getCollisionFilter(this.team);

		// we create the body collider of the character
		this.body = new CANNON.Body({
			mass: mass,
			position: position,
			material: Character.MATERIAL,
			fixedRotation: true,
			collisionFilterGroup: options.filterGroup || filter.group,
			collisionFilterMask:  options.filterMask  || filter.mask ,
		});
		CANNON.Body.idFix();

		// we add both shapes to the body
		this.body.addShape(body_shape, body_pos); // shape 0 = body
		this.body.addShape(head_shape, head_pos); // shape 1 = head

		// we add more information to the bodies
		this.body.controllable = this; // a reference to the character
		if(!options.noHead) head_shape.isHead = true; // this shape is the head
	}

	/* SETTER GETTER */
	/**
	Return  the position of the Character
	@method get Position
	@return {Vec3} The position in space
	*/
	get Position(){
		return this.body.position;
	}
  /**
	Return the orientation of the Character
	@method get Orientation
	@return {Vec2} The orientation in space
	*/
	get Orientation(){
		return this.orientation;
	}
	/**
	Return the collisionFilterMask of the Character
	@method get FilterMask
	@return {Number} The filter mask of the controllable
	*/
	get FilterMask(){
		return this.body.collisionFilterMask;
	}
	/**
	Set the collisionFilterMask of the Controllable
	@private To implement in extending classes
	@method get FilterMask
	@param {Number} mask The filter mask of the controllable
	*/
	set FilterMask(mask){
		this.body.collisionFilterMask = mask;
	}
	/**
	Return the main CANNON.body of the controllable
	@private To implement in extending classes
	@method get Body
	@param {Body} The main CANNON Body
	*/
	get Body(){
		return this.body;
	}

	/* UPDATE FUNCTIONS */

	/**
	Global update function of the character
	*/
	update(){
		if(this.controller !== null){
			var inputs = this.controller.inputs || null;
			if(inputs !== null){
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
		}
	}
	/**
	Allow the character to look around
	calculation based on mouse delta is performed client side
	*/
	setLook( orientation ){
		// we keep angle in the [ -2PI, 2PI ] interval
		orientation.x %= Math.PI2;
		orientation.y %= Math.PI2;
		// we cap the angle on the Y-axis within [ -PI/2, PI/2 ] interval
		     if(orientation.y >  Math.HPI) orientation.y =  Math.HPI;
		else if(orientation.y < -Math.HPI) orientation.y = -Math.HPI;
		// we apply the orientation
		this.orientation.x = orientation.x;
		this.orientation.y = orientation.y;
	}
	/**
	Allow to add more rotation to the character on the Y-axis
	*/
	addRotation( angle ){
		// we add the angle on the Y-axis
		this.orientation.x += angle;
		this.orientation.x %= Math.PI2;
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
			z: ( -axis.x*Math.sin(theta) -axis.y*Math.cos(theta) ) * speed,
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
					return null; // we don't need to check the others
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
		if(this.weapons.length === 0 || typeof index !== "number") return null;
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
			var incre = index === -1 ? -1 : +1;
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

		// we call the necessary functions to update the display in HERSTAL client

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

	/**
	Remove the character from the world
	@method die
	*/
	die(){
		// we remove the body from the world
		this.world.removeBody(this.body);
		// we unlink the character from the player
		this.player.character = null;
		// we keep track of the body to generate the corpse client side
	}

	/**
	Read all of the position and movement of the character and create a object out of them
	@method getJSONFromState
	@return {Object} State of the character
	*/
	getJSONFromState(){
		var state = 0;
		if(this.isGrounded)  state |=  0b1;
		if(this.isCrounched) state |= 0b10;

		return {
			orient : {
				x : this.orientation.x,
				y : this.orientation.y,
			},
			pos : {
				x : this.body.position.x,
				y : this.body.position.y,
				z : this.body.position.z,
			},
			vel : {
				x : this.body.velocity.x,
				y : this.body.velocity.y,
				z : this.body.velocity.z,
			},
			state : state,
			weap  : this.currentWeapon,
		};
	}

}
HERSTAL.Character = Character;

// id to assign to newly created character
// go from 0 to Number.MAX_SAFE_INTEGER
Character.idCount = 0;

// we create a new material for the characters
Character.MATERIAL = new CANNON.Material("character");

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
