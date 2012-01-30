#!/usr/bin/php
/*!
 * ------------------------------------------------------------------               
 * ( Belt )
 *
 * Interoperability library for script inclusion within titanium desktop sdk >= 1.2.0
 *
 * Copyright 2011-2012, Gianni Furger <gianni.furger@gmail.com>
 * 
 * https://raw.github.com/alternatex/belt/master/LICENSE
 *
 * ------------------------------------------------------------------ 
 */

global $window;

if(!isset($window->belt)) {
		
	// extract namespace
	$beltspace = __NAMESPACE__;
	
	// belt object  
	class BELT {
		// ...
		static $EXEC_ANALYZE = 1;
		static $EXEC_INSTANTIATE = 2;
		static $EXEC_DELEGATE = 3;
		static $EXEC_DESTRUCT = 4;
		static $INSTANCES = array();
					
		static function Analyze($strapKlassName, $strapKlassPath){
			// gain access to objects
			global $window, $belt;
						
			// fetch source
			require_once($strapKlassPath);

			// get reflection object
			$reflectionClass = new \ReflectionClass($strapKlassName);
			
			// extract methods
			$reflectionMethods = $reflectionClass->getMethods();
			
			// populate / register methods
			foreach($reflectionMethods as $reflectionMethod) {
				// for now: skip some (constructor/destructor)
				if($reflectionMethod->name=='__construct' || $reflectionMethod->name=='__destruct')
					continue;
				// register method			
				$belt->inject($strapKlassName, $reflectionMethod->name, ''); 			
			}				
		}
		
		static function Instantiate($strapKlassName, $instanceName, $instanceArgs=null){
			global $window, $belt;

			// typecast; convert object to array
			$instanceArgs = (array) $instanceArgs;
			
			// constructor arguments
			$paramStr = ''; $i=0;	
			
			// build string for usage in eval() 		
			foreach($instanceArgs as $key => $value){ if($i>0) $paramStr .= ', '; $paramStr .= '\''.$value.'\''; $i++; }
			
			// perform instantiation
			eval("\$$instanceName = new $strapKlassName($paramStr);");			
			
			// register instance
			static::$INSTANCES[$instanceName] = $$instanceName;
		}		
				
		static function Delegate($instanceName, $functionName, $functionArgs=null){
			global $window, $belt;			
			
			// fetchInstance 
			$instance = static::$INSTANCES[$instanceName];
			
			// typecast; convert object to array
			$functionArgs = (array) $functionArgs;
			
			// process delegation			
			$retVal = call_user_func_array(array($instance, $functionName), $functionArgs); // $retVal = $instance->$functionName(); // w/o args															
		
			// store returned value							
			$belt->callReturn = $retVal;
		}
		
		static function Destruct($instanceName){
			unset(static::$INSTANCES[$instanceName]);
		}
	}	
} else {		
	// extract belt object
	$belt = $window->belt;
	
	// perform requested action
	switch($belt->shared->action){
		case BELT::$EXEC_ANALYZE:
			// ..
			BELT::Analyze($belt->shared->strapKlassName, $belt->shared->strapKlassPath);
			break;
		case BELT::$EXEC_INSTANTIATE:
			// ..
			BELT::Instantiate($belt->shared->strapKlassName, $belt->shared->callInstance, $belt->shared->callFunctionArgs);
			break;
		case BELT::$EXEC_DELEGATE:		
			// ..
			BELT::Delegate($belt->shared->callInstance, $belt->shared->callFunction, $belt->shared->callFunctionArgs);		
			break;
		case BELT::$EXEC_DESTRUCT:		
			// ..
			BELT::Destruct($belt->shared->callInstance);		
			break;							
		default:
			break;
	}		
}