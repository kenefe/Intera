/**
* @FolmeManager
* @author kenefe kenefe.li@gmail.com
* @version 3.0
*/
package com.kenefe.folme {
	import flash.display.*;
	import flash.events.*;
	import flash.text.*;
	import flash.utils.*;
	import flash.system.System;

	import com.kenefe.folme.force.*;

	public class FolmeEase extends MovieClip{

		public static function spring(damping,response, mass=1){
			return new Spring(damping,response, mass);
		}

		public static function springImpulse(damping,response, impulse=0, mass=1){
			return new SpringImpulse(damping,response, impulse, mass);
		}

		public static function acceleration(acc){
			return new Acceleration(acc);
		}

		public static function friction(friction = 1/2.1){
			return new Friction(friction);
		}

		public static function immediate(){
			return new Immediate();
		}

		public static function force(){
			return new Force();
		}



		// 注意：Gravity和Perlin不会结束
		public static function gravity(acc){
			return new Gravity(acc);
		}

		public static function perlin(changeSpeed,stepDistance){
			return new Perlin(changeSpeed,stepDistance);
		}



		// 插值器
		public static function linear(duration = 0.3){
			return new IEasing(Interpolator.linear,duration);
		}
		public static function quadOut(duration = 0.3){
			return new IEasing(Interpolator.quadOut,duration);
		}
		public static function quadIn(duration = 0.3){
			return new IEasing(Interpolator.quadIn,duration);
		}
		public static function quadInOut(duration = 0.3){
			return new IEasing(Interpolator.quadInOut,duration);
		}
		public static function cubicOut(duration = 0.3){
			return new IEasing(Interpolator.cubicOut,duration);
		}
		public static function cubicIn(duration = 0.3){
			return new IEasing(Interpolator.cubicIn,duration);
		}
		public static function cubicInOut(duration = 0.3){
			return new IEasing(Interpolator.cubicInOut,duration);
		}
		public static function quartOut(duration = 0.3){
			return new IEasing(Interpolator.quartOut,duration);
		}
		public static function quartIn(duration = 0.3){
			return new IEasing(Interpolator.quartIn,duration);
		}
		public static function quartInOut(duration = 0.3){
			return new IEasing(Interpolator.quartInOut,duration);
		}
		public static function quintOut(duration = 0.3){
			return new IEasing(Interpolator.quintOut,duration);
		}
		public static function quintIn(duration = 0.3){
			return new IEasing(Interpolator.quintIn,duration);
		}
		public static function quintInOut(duration = 0.3){
			return new IEasing(Interpolator.quintInOut,duration);
		}
		public static function sinOut(duration = 0.3){
			return new IEasing(Interpolator.sinOut,duration);
		}
		public static function sinIn(duration = 0.3){
			return new IEasing(Interpolator.sinIn,duration);
		}
		public static function sinInOut(duration = 0.3){
			return new IEasing(Interpolator.sinInOut,duration);
		}
		public static function expoOut(duration = 0.3){
			return new IEasing(Interpolator.expoOut,duration);
		}

		public static function android(duration = 0.3){
			return new IEasing(Interpolator.android,duration);
		}

		public static function bezier(x1,y1,x2,y2,duration = 0.3){
			return new IEasing(Interpolator.bezier(x1,y1,x2,y2),duration);
		}

		public static function fakeSpring(damping = 0.9,response = 0.85,duration = 0.350){
			return new FakeSpring(damping,response,duration);
		}

	}
}