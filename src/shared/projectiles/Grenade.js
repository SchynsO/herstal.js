/**
@class Grenade
*/
class Grenade extends HERSTAL.Projectile {
	/**
	@constructor
	@param {String} name The name of the weapon
	@param {Launcher} weapon The weapon who emitted that projectile
	@param {Vec3} position The position of the grenade when created
	@param {Quaternion} orientation The orientation of the grenade when created
	@param {Object} [options] Configuration of the Projectile
	@param {Number} [options.speed] The speed of the grenade at start
	@param {Number} [options.mass] The mass of the grenade
	@param {Number} [options.shape] The shape of the grenade
	@param {Number} [options.shapeRadius] The radius of the sphere or cylinder
	@param {Number} [options.shapeWidth] The width of the box
	@param {Number} [options.shapeHeight] The height of the box or cylinder
	@param {Number} [options.shapeLength] The length of the box
	@param {Number} [options.filterGroup] The filter group of the body
	@param {Number} [options.filterMask]  The filter mask of the body
	*/
	constructor(name, weapon, position, orientation, options){
		options = options || {};
		// call projectile constructor
		super(name, weapon, options);

		// default shape is sphere
		var shape  = options.shape || Grenade.SPHERE,
				radius = options.shapeRadius || 0.05,
				width  = options.shapeWidth  || 0.1,
				height = options.shapeHeight || 0.1,
				length = options.shapeLength || 0.1,
				numSeg = options.numSegments || 8;
		// create shape based on given parameters
		switch(shape){
			case Grenade.CYLINDER :
				shape = new CANNON.Cylinder(radius, radius, height, numSeg);
				break;
			case Grenade.BOX :
				shape = new CANNON.Box(
					new CANNON.Vec3(width*0.5, height*0.5, length*0.5)
				);
				break;
			default : // SPHERE
				shape = new CANNON.Sphere(radius);
		}
		// we need a velocity for our projectile
		var speed = options.speed || 20;
		var velocity = Util.getForward(orientation).scale(speed);

		// we create the body of our grenade
		this.body = new CANNON.Body({
			mass: options.mass || 1,
			shape: shape,
			velocity: velocity,
			collisionFilterGroup: options.filterGroup || weapon.filterGroup,
			collisionFilterMask:  options.filterMask  || weapon.filterMask,
		});

		// we add the body to the world
		this.world.addBody(this.body);

		// we add an event to detect new collisions
		this.body.addEventListener("collide", (event) => {
			// if the grenade touch a character, it explodes
			if(event.contact.body.character != null) this.isDestroyed = true;
		});
	}

	// we don't need to extend update()

	/**
	Return the position of the Projectile
	@method get Position
	@return {Vec3} The position in space
	*/
	get Position(){
		return this.body.position;
	}

	/**
	Return the orientation of the Projectile
	@method get Orientation
	@return {Quaternion} The orientation in space
	*/
	get Orientation(){
		return this.body.quaternion;
	}
}
HERSTAL.Grenade = Grenade;

Grenade.CYLINDER = 1;
Grenade.SPHERE   = 2;
Grenade.BOX      = 4;
