/**
Abstract Base class for all weapons
@class Weapon
*/
class Weapon {
	/**
	@constructor
	@param {String} name The name of the weapon
	@param {Character} character The character holding the weapon
	@param {Object} [options] Configuration of the weapon
	@param {Number} [options.damage] Number of damage dealt by the weapon
	@param {Number} [options.ammo] Number of ammo currently in the weapon
	@param {Number} [options.maxAmmo] Max ammo of the weapon
	@param {Number} [options.firerate] Number of shots per seconds
	@param {Number} [options.recoil] Force at which the holder will be propelled back by the shot
	@param {Number} [options.filterGroup] Define the collision group of the weapon
	@param {Number} [options.filterMask] Define the collision mask of the weapon
	@param {Boolean} [options.notAcquired] Has the weapon not been acquired ?
	*/
	constructor(name, character, options){
		options = options || {};

		// id of the weapon for multiplayer identification
		this.id = null;

		// name of the weapon and character using it
		this.name      = name;
		this.character = character;
		// world in which the weapon exists
		this.world = character.world;

		// damage dealt by the weapon if raycast or too close range
		this.damage = options.damage || 0;
		// if maxAmmo is set and greater than 0
		if(options.maxAmmo > 0){
			this.ammo    = options.ammo;
			this.maxAmmo = options.maxAmmo;
		}
		this.firerate = options.firerate > 0 ? options.firerate : 60;
		this.acquired = !options.notAcquired;

		// which group and mask should we use for this weapon ?
		var team = options.team || this.character.team;
		var filter = HERSTAL.TEAM.getCollisionFilter(team);
		this.filterGroup = options.filterGroup || filter.group;
		this.filterMask  = options.filterMask  || filter.mask ;
	}

	/**
	Method called when the weapon is equiped and the player press fire1
	@method fire
	*/
	fire(){}

	/**
	Method called when the weapon is equiped and the player press fire2
	@method secondary
	*/
	secondary(){}
}
// we add the class to the Namespace
HERSTAL.Weapon = Weapon;
