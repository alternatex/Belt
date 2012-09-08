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

(function(){	
	
	// execution environment
	var scope = this
	  , contexts = {
		  php: '../../lib/belt.php'
	   };
	  
	var context = contexts.php;
		
	// action-hooks helper
        this.Action = {

            // attach Before/After handler
            hook: function(advice, options, callback, callbackAfter){

                // validate 
                if(typeof(options.target)!='undefined') {

                    // extract class | instance 
                    var reference = (typeof(options.target)=='function') ? options.target.prototype : options.target;

                    // define if not defined yet .... tssz
                    if(typeof(reference[options.method])=='undefined'){
                        reference[options.method] = function(){};
                    }

                    // wrap
                    (function(target, method){                                                          

                        // extract helpers
                        target = typeof(target)=='function' ? target.prototype : target;
                        var delegate = target[method];

                        // wrap function
                        reference[method] = function(){ 

                            // pre-process
                            if(advice=='before' || advice=='both') callback.apply(this, arguments);                     

                            // process
                            var returnValue = delegate.apply(this, arguments);                                                                  

                            // new instance hook-speciality: assign/expose instance so we can modify it (direct modification does not work - it *needs* to be reference by a newly created property otherwise changes will only be affected in the hook - not the same object...!)
                            if(method=='new') arguments[1].instance = returnValue;

                            // post-process
                            if(advice=='after' || advice=='both') (advice=='both' ? callbackAfter : callback).apply(this, arguments);                            

                            // ...
                            return returnValue;
                        };
                    })(options.target, options.method);
                }                               
            },

            // delegate Before 
            before: function(options, callback){ return Action.Hook('before', options, callback); },

            // delegate After
            after: function(options, callback){   return Action.Hook('after', options, callback); },      
        };  			
		
	// fake-class construct	 
	function Klass(){}
	Klass.extend = function(_klass){
	  var klass = _klass.constructor || function(){};
	  klass.parent = _klass.__proto__ = this.prototype;
	  klass.prototype = _klass;
	  klass.extend = arguments.callee;	  	  	  	  
	  return klass;			
	};		
	
	// initialize php belt base obj def (tit.....)
	Titanium.include(context);
	
	/**
	 * @namespace 
	 * @description belt's scope 	
	 */												 
	if(typeof(scope.belt) == 'undefined') { var belt = {						
		/**
		 * @class
		 * @description base class for php-js-object portation 	
		 */		
		strap: Klass.extend({						
			// instance members
				constructor: function(){								
					// generate identifier
					this.id = this._name+"_"+(new Date()).getTime();	
					// register instance
					this.instances[this.id] = this;
				},
				destructor: function(){
					belt.destructor(this.id);
				},
				
				// static members
				instances: {}, _name: 'strap', _namespace: '\\'
			} 			
		),		
					 									
		// belt's abilities
		actions: { ANALYZE: 1, INSTANTIATE: 2 , DELEGATE: 3, DESTRUCT: 4},
		
		// strap-books
		classes: {},
		functions: {},
		paths: {},
		
		// shared script vars 		
		shared: {
			
			// current belt-php action			
			action: null,
			
			// analysis/instantiation - TODO: thread-safe
			strapKlass: null,
			strapKlassName: null,
			strapKlassPath: null,
			strapKlassCallbacks: null,
			
			// runtime - TODO: thread-safe
			callInstance: null,
			callFunction: null,
			callFunctionArgs: null,
			callFunctionArgsLength: null,
			callReturn: null
		},		
						
		/**
		 * @function
		 * @description analyze php class > create js clone
		 * @param String className within context(> without namespace.....)
		 * @param String classNamespace to be used for object access
		 * @param String classPath used for source file inclusion (require_once..)
		 * @param Object classCallbacks user-defined objects hooked post-php-fnc execution
		 * @return void		 
		 */						 
		analyze: function(className, classNamespace, classPath, classCallbacks){	
					
			// skip if already defined (+ message - shouldn't happen)			
			if(typeof(belt.classes[className])=='undefined') {
								
				// create new class  
				belt.shared.strapKlass = belt.classes[className] = belt.strap.extend({constructor: function(){
					arguments.callee.parent.constructor.call(this);										
				}, _name: className, _namespace: classNamespace});

				// set-helper: callbacks
				belt.shared.strapKlassCallbacks = classCallbacks;				
				
				// set-helper: fully qualified classname
				belt.shared.strapKlassName = classNamespace+className;
				
				// set-helper: classpath	
				belt.shared.strapKlassPath = classPath;
				
				// exec 
				belt.execute(belt.actions.ANALYZE);	
								
				// reset helpers				
				belt.shared.strapKlassName = belt.shared.strapKlassPath = '';
				belt.shared.strapKlass = belt.shared.strapKlassCallbacks = null; 											
			} 	
		},
		
		/**
		 * @function
		 * @description batch process "packaged" objects
		 * 				packaged as following some conventions:
		 * 				- <className>.php 
		 *  	 		- shared-namespace (aka same for all)
		 * 				- .php-files are located in the same directory
		 * @return void		 
		 */				
		include: function(classNames, classNamespace, classPath, classCallbacks){
			var classNames = classNames.split(',');			
			for(var i=0; i<classNames.length; i++) {
				classNames[i] = classNames[i].trim();
				belt.analyze(classNames[i], classNamespace, classPath+classNames[i]+'.php', classCallbacks);
			}
		},	
					
		/**
		 * @function
		 * @description map php function to js clone
		 * @param String className within context(> without namespace.....)
		 * @param String functionName ...
		 * @param String functionArgs register avail arguments LIAR >> TODO: IMPLEMENT
		 * @return void		 
		 */	
		inject: function(className, functionName){
			// assign delegate / callback scoped											
			var callback = belt.shared.strapKlassCallbacks[functionName];
			belt.shared.strapKlass.prototype[functionName] = function(){						
				var returnValue = belt.delegate(this.id, functionName, arguments);					
				if(typeof(callback)!='undefined')			 							
					callback.apply(this, [returnValue]);
				return returnValue;
			};							
		},	

		/**
		 * @function
		 * @description instantiate class
		 * @param String className to be instatiated
		 * @param String args constructoror arguments
		 * @return void		 
		 */			
		instantiate: function(className, instanceArgs){			
			// set helpers
			belt.shared.callFunctionArgs = {};
			
			// transform array into object
			var i = 0;
			for(var argument in instanceArgs) { belt.shared.callFunctionArgs[i] = instanceArgs[argument]; i++; }
			
			// create js-obj 
			var instance = new belt.classes[className]();
			
			// set-helper: fully qualified classname
			belt.shared.strapKlassName = instance._namespace+className;	
			belt.shared.callInstance = instance.id;				
			
			// create php-obj
			belt.execute(belt.actions.INSTANTIATE);
						
			// reset helpers			
			belt.shared.strapKlassName = belt.shared.callInstance = null;
			belt.shared.callFunctionArgs = {};			
			
			return instance;		
		},
		
		/**
		 * @function
		 * @description delegate js to php function call
		 * @param String instanceName
		 * @param String functionName
		 * @param String functionArgs 
		 * @return void		 
		 */					
		delegate: function(instanceName, functionName, functionArgs){
			// set helpers
			belt.shared.callInstance = instanceName;
			belt.shared.callFunction = functionName;
			belt.shared.callFunctionArgs = {};
			belt.shared.callFunctionArgsLength = functionArgs.length;
			
			// transform array into object (compliance) - TODO: recurse
			for(var i=0;i<functionArgs.length;i++) {
				belt.shared.callFunctionArgs[i] = functionArgs[i];
			}
						
			// delegate call
			belt.execute(belt.actions.DELEGATE);
			
			// temp sav
			var returnValue = belt.callReturn;

			// reset helpers
			belt.shared.callInstance = belt.shared.callFunction = belt.shared.callReturn = null;
			belt.shared.callFunctionArgsLength = 0;
			belt.shared.callFunctionArgs = {};
												
			return returnValue;			
		},		

		/**
		 * @function
		 * @description destructor instance... 
		 * @param String instanceName
		 * @return void		 
		 */									
		destructor: function(instanceName){
			// set helpers
			belt.shared.callInstance = instanceName;
			belt.shared.callFunctionArgs = {};
			belt.shared.callFunctionArgsLength = 0;
			
			// delegate call
			belt.execute(belt.actions.destruct);
			
			// reset helpers
			belt.shared.callFunction = null;			
		},

		/**
		 * @function
		 * @description belt-php delegation 
		 * @param String action
		 * @return void		 
		 */							
		execute: function(action){	
			// set action to be executed		
			belt.shared.action = action;
			// include script - exec
			Titanium.include(context);				
		}	
	}
	// expose 
	scope.belt = belt;						
	}
	
	// loggers
	Action.before( {target: belt, method: 'analyze'}, function(args){
		// false = classExistsException
		return (typeof(belt.classes[args[0]])=='undefined');
	});
	Action.before( {target: belt, method: 'instantiate'}, function(args){
		// false = classNotFoundException
		return (typeof(belt.classes[args[0]])!='undefined');		
	});	
})();

// expose 'gain (^)
var Belt = function(className, options){
	
	// apply defaults
	var options = options || {};
	options.classNamespace = options.classNamespace || '\\';
	options.classPath = options.classPath || '';
	options.classCallbacks = options.classCallbacks || {};
	options.instantiate = (typeof(options.instantiate)!='undefined' ? options.instantiate : true); // booleans shouldn't be used with... ^
	options.instanceArgs = options.instanceArgs || []; 
	
	// package or class?
	if(className.indexOf(',')!=-1) {
		
		// analyze package		
		belt.include(className, options.classNamespace, options.classPath, options.classCallbacks);
			
	} else {
								
		// analyze class
		belt.analyze(className, options.classNamespace, options.classPath, options.classCallbacks);
		
		// apply param or by default: undefined = true
		if(options.instantiate)
			return belt.instantiate(className, options.instanceArgs);
					
	}
}