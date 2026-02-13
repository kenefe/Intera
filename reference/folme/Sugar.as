/**
* @Sugar
* @author kenefe kenefe.li@gmail.com
* @version 3.0
*/
package com.kenefe.folme {
	import flash.display.*;
	import flash.events.*;
	import flash.text.*;
	import flash.utils.*;
	import flash.system.System;

	public class Sugar{

		public static var VIEW_TYPE = {
			INSERT:0, // EMBED
			BLOCK:1
		}

		public static var SUGAR_EVENT = {
			MOUSE_DOWN:'mouseDown',
			MOUSE_UP:'mouseUp',
			LONG_CLICK:'longClick',
			SHOW:'show',
			HIDE:'hide'
		}

		private var state = {
			mouseDown:{
				scaleX:0.9,
				scaleY:0.9,
				alpha:1,
				tint:Folme.tint(0x000000,0.08)
			},
			mouseUp:{
				scaleX:1,
				scaleY:1,
				alpha:1,
				tint:Folme.tint(0x000000,0)
			},
			longClick:{
				scaleX:1.1,
				scaleY:1.1,
				alpha:1,
				tint:Folme.tint(0x000000,0)
			},
			show:{
				autoAlpha:1,
				scaleX:1,
				scaleY:1
			},
			hide:{
				autoAlpha:0,
				scaleX:1,
				scaleY:1
			}

		}


		public var view;
		public var viewType = VIEW_TYPE.BLOCK;

		public var bound = {x:0,y:0};
		public var moves = {x:0,y:0};
		public var showDelay = 0;

		public function Sugar(_view,_viewType = undefined){

			if(_viewType===undefined) _viewType = VIEW_TYPE.INSERT; 

			view = _view;
			viewType = _viewType;

			var smallScale = viewType == VIEW_TYPE.BLOCK ? calSmallScale() : 1;

			mouse().setScale(smallScale,SUGAR_EVENT.MOUSE_DOWN);
			mouse().setScale(calLargeScale(),SUGAR_EVENT.LONG_CLICK);

			visible().setScale(smallScale,SUGAR_EVENT.HIDE);
			visible().setBound(view.x,view.y);

		}



		// mouse
		public function mouseDown(config  = undefined){
			var defaultConfig = {
				ease:FolmeEase.spring(1,0.25)
			};
			view.folme.to(state.mouseDown,config || defaultConfig);
		}
		public function mouseUp(config  = undefined){
			var defaultConfig = {
				ease:FolmeEase.spring(1,0.3),
				special:{
					alpha:FolmeEase.spring(1,0.4),
					tint:FolmeEase.spring(1,0.4)
				}
			};

			var DOWN = state[SUGAR_EVENT.MOUSE_DOWN];
			var UP = state[SUGAR_EVENT.MOUSE_UP];

			// 只有变色
			if( 
				DOWN.tint.equal(UP) && 
				DOWN.scaleX == 1 && DOWN.scaleY == 1
			) {
				defaultConfig.special.alpha = FolmeEase.spring(1,0.6)
				defaultConfig.special.tint = FolmeEase.spring(1,0.6)
			}
			view.folme.to(state.mouseUp,config || defaultConfig);
		}
		public function longClick(config  = undefined){
			var defaultConfig = {
				ease:FolmeEase.spring(0.8,0.3)
			};
			view.folme.to(state.longClick,config || defaultConfig);
		}

		public function setMouseDown(config  = undefined){
			view.folme.setTo(state.mouseDown,config);
		}
		public function setMouseUp(config  = undefined){
			view.folme.setTo(state.mouseUp,config);
		}
		public function setLongClick(config  = undefined){
			view.folme.setTo(state.longClick,config);
		}


		// visible
		public function show(config = undefined){
			var haveScale = state[SUGAR_EVENT.HIDE].scaleX <= 1;
			var haveMove = moves.x > 0 || moves.y > 0;

			var ease;
			if(!haveScale && !haveMove)
				ease = FolmeEase.spring(1,0.35)
			else if(haveScale && !haveMove)
				ease = FolmeEase.spring(0.9,0.3)
			else if(!haveScale && haveMove)
				ease = FolmeEase.spring(0.95,0.3)
			else
				ease = FolmeEase.spring(0.9,0.25)
			
			var defaultConfig = {
				ease:ease,
				delay:showDelay
			}
			view.folme.to(state.show,config || defaultConfig);
		}
		public function hide(config = undefined){
			var haveScale = state[SUGAR_EVENT.HIDE].scaleX <= 1;
			var haveMove = moves.x > 0 || moves.y > 0;

			var ease;
			if(!haveScale && !haveMove)
				ease = FolmeEase.spring(1,0.3)
			else if(haveScale && !haveMove)
				ease = FolmeEase.spring(0.6,0.35)
			else if(!haveScale && haveMove)
				ease = FolmeEase.spring(0.66,0.35)
			else
				ease = FolmeEase.spring(0.7,0.35)
			
			var defaultConfig = {
				ease:ease
			}
			view.folme.to(state.hide,config || defaultConfig);
		}

		public function setShow(config  = undefined){
			view.folme.setTo(state.show,config);
		}
		public function setHide(config  = undefined){
			view.folme.setTo(state.hide,config);
		}






		// 配置
		public function mouse(){
			return {
				setScale:function(val,sugarEvent = undefined){
					if(sugarEvent === undefined) sugarEvent = SUGAR_EVENT.MOUSE_DOWN;
					state[sugarEvent].scaleX = state[sugarEvent].scaleY = val;
					return this;
				},
				setAlpha:function(val,sugarEvent = undefined){
					if(sugarEvent === undefined) sugarEvent = SUGAR_EVENT.MOUSE_DOWN;
					state[sugarEvent].autoAlpha = val;
					return this;
				},
				setTint:function(tint,tintAmount,sugarEvent = undefined){
					if(sugarEvent === undefined) sugarEvent = SUGAR_EVENT.MOUSE_DOWN;
					state[sugarEvent].tint = Folme.tint(tint,tintAmount);
					return this;
				}
			}
		}

		public function visible(){
			return {
				setScale:function(val,sugarEvent = undefined){
					if(sugarEvent === undefined) sugarEvent = SUGAR_EVENT.HIDE;
					state[sugarEvent].scaleX = state[sugarEvent].scaleY = val;
					return this;
				},
				setAlpha:function(val,sugarEvent = undefined){
					if(sugarEvent === undefined) sugarEvent = SUGAR_EVENT.HIDE;
					state[sugarEvent].alpha = val;
					return this;
				},
				setMove:function(valX,valY){
					moves.x = valX;
					moves.y = valY;
					state.hide.x = bound.x + moves.x;
					state.hide.y = bound.y + moves.y;
					state[SUGAR_EVENT.SHOW].x = bound.x;
					state[SUGAR_EVENT.SHOW].y = bound.y;
					state[SUGAR_EVENT.HIDE].x = bound.x + moves.x;
					state[SUGAR_EVENT.HIDE].y = bound.y + moves.y;
					return this;
				},
				setBound:function(x,y){
					bound.x = x;
					bound.y = y;
					visible().setMove(moves.x,moves.y);
					return this;
				},
				setShowDelay:function(val){
					showDelay = val;
					return this;
				}
			}
		}




		// 动态计算
		public function calSmallScale(){
			var _maxLongWidth = view.height > view.width ? view.height : view.width;
			var _scaleDis = 10;
			var _scale = (_maxLongWidth - 2*_scaleDis)/_maxLongWidth;
			_scale = Math.max(_scale,0.9);
			return _scale;
		}

		public function calLargeScale(){
			var _maxLongWidth = view.height > view.width ? view.height : view.width;
			var _scaleDis = 10;
			var _scale = (_maxLongWidth + 2*_scaleDis)/_maxLongWidth;
			_scale = Math.min(_scale,1.2);
			return _scale;
		}

	}
}