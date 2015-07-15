(function(ko) {
    function ViewModel() {
        var self = this;
        
        self.settings = {
            uppercase: true
        };
        
        self.base = ko.observable(1);
        self.checked = ko.observableArray();
        self.selectedValue = ko.computed(function() {
            var value = 0;
            var checked = self.checked();
            for(var i=0;i<checked.length; ++i) {
                value = value | checked[i];
            }
            return value;
        });
        self.engine = ko.observable();
        self.engineParam = ko.observable();
        self.engineParamVisible = ko.observable();
        self.engines = ko.observableArray();
        self.keyedEngines = {};
        
        self.values = ko.observableArray([]);
        self.keyedValues = {};
        self.valuesToAdd = ko.observable('');
        self.valuesToAgg = ko.observable('');
        self.valueToAgg = ko.observable('');
        self.aggPlaceholder = ko.computed(function() {
            if(self.selectedValue())
                return self.selectedValue();
        });
        
        self.values.subscribe(function(objects){
            for(var i=0;i<objects.length;++i) {
                var i_value = objects[i].value;
                var i_status = objects[i].status;
                if(i_status == 'added')
                    self.keyedValues[i_value.name] = i_value.base;
                else if(i_status == 'deleted' && !objects[i].moved)
                    delete self.keyedValues[i_value.name];
            }
            
            self.values.sort(function(a,b){return a.base-b.base;});
            var sorted = Object.keys(self.keyedValues).sort(function(a,b){return self.keyedValues[a]-self.keyedValues[b];});
            var newKeyedValues = {};
            for(var j=0;j<sorted.length;++j) {
                newKeyedValues[sorted[j]] = self.keyedValues[sorted[j]];
            }
            self.keyedValues = newKeyedValues;
        }, null, 'arrayChange');
        
        self.rendered = ko.computed(function() {
            if(undefined !== self.keyedEngines[self.engine()]) {
                var engineObject = self.keyedEngines[self.engine()];
                return engineObject.callback.call(self, self.values(), self.engineParam());
            }
        });
        
        self.addIt = function() {
            var success = true;
            var arr = self.valuesToAdd().trim().split("\n");
            for(var i=0; i<arr.length;++i) {
                var name = arr[i].trim();
                if(name.length > 0)
                    success = success & addValue(name);
            }
            if(success) self.valuesToAdd('');
        };
        self.aggIt = function() {
            var arr = self.valuesToAgg()?self.valuesToAgg().trim().split("\n"):[];
            var base = 0;
            var success = true;
            if(arr.length === 0 && self.selectedValue()) {
                base = self.selectedValue();
            }
            else
                for(var i=0; i<arr.length;++i) {
                    var i_name = arr[i].trim();
                    if(i_name.length > 0) {
                        if (i_name == '*'){
                            base = base | self.base()-1;
                        }
                        else if(undefined !== self.keyedValues[i_name]) {
                            base = base | self.keyedValues[i_name];
                        }
                        else if (parseInt(i_name)){
                            base = base | parseInt(i_name);
                        }
                        else {
                            success = false;
                        }
                    }
                }
            var name = self.valueToAgg().trim();
            if(success && base && undefined === self.keyedValues[name] && name.length) {
                self.values.push({'name': name, 'base': base});
                self.valueToAgg('');
                self.valuesToAgg('');
            }
        };
        
        function addValue(name) {
            if(undefined === self.keyedValues[name]) {
                var base = self.base();
                self.values.push({'name': name, 'base': base});
                self.base(self.base()*2);
                return true;
            }
            return false;
        }
        var addValues = function(json) {
            var max = 0;
            for(var i=0; i<json.length;++i) {
                var i_value = json[i];
                self.values.push({'name': i_value.name, 'base': i_value.base});
                if(i_value.base > max)
                    max = i_value.base;
            }
            self.base(Math.pow(2, 1+Math.floor(Math.log(max)/Math.log(2))));
        };
        self.addValues = addValues;
        self.reset = function() {
            self.base(1);
            self.values.splice(0);
            wisebit.valueToAgg('');
            wisebit.valuesToAgg('');
            wisebit.valuesToAdd('');
        };
        
        self.registerEngine = function(name, callback, param) {
            self.keyedEngines[name] = { name: name, callback: callback, param: param };
            self.engines.push(name);
        };
        self.switchEngine = function(engine) {
            self.engine(engine);
            if(undefined !== self.keyedEngines[self.engine()]) {
                var engineObject = self.keyedEngines[self.engine()];
                self.engineParam(engineObject.param);
                self.engineParamVisible(engineObject.param && engineObject.param.length>0);
            }
        };
        
        self.examples = ko.observableArray([]);
        self.doExample = function(example) {
            self.reset();
            example.callback.call(self, self);
        };
    }
    
    var vm = new ViewModel();
    ko.applyBindings(vm, document.getElementById('vm'));
    
    vm.registerEngine('JSON', function(values) {
        return JSON.stringify(this.keyedValues);
    });
    vm.registerEngine('JSON 2', function(values) {
        return JSON.stringify(this.values());
    });
    vm.registerEngine('PHP', function(values) {
        var str = 'array(';
            for(var name in this.keyedValues)
                str += "'"+name+"' => "+this.keyedValues[name]+", ";
            str += ')';
        return str;
    });
    vm.registerEngine('C', function(values) {
        var str = 'enum WISEBIT {\n';
        for(var i=0;i<values.length;++i) {
            var name = values[i].name;
            var base = values[i].base;
            str += "    "+name.toUpperCase()+" = "+base;
            if(i < values.length-1) str += ",";
            str += "\n";
        }
        str += '}';
        return str;
    });
    vm.registerEngine('Python', function(values) {
        var str = 'class Wisebit(Enum):\n';
        for(var name in this.keyedValues)
            str += "\t"+name+" = "+this.keyedValues[name] + "\n";
        return str;
    });
    vm.registerEngine('static', function(values, param) {
        var str = '    /* Wisebits */\n';
        for(var name in this.keyedValues)
            str += "    "+param+" "+name.toUpperCase()+" = "+this.keyedValues[name] + ";\n";
        return str;
    }, 'public const int');
    
    vm.switchEngine(vm.engines()[0]);
    
    window.wisebit = vm; // Leak into global namespace
    
})(ko);

// Examples here
wisebit.examples([
    {name: 'States', callback: function(wisebit) {
        
        wisebit.switchEngine("static");
        wisebit.addValues([
            {name: 'State1', base: 1 },
            {name: 'State2', base: 2 },
            {name: 'State3', base: 4 },
            {name: 'StateMask', base: 7 }
            ]);
        wisebit.valueToAgg('State1|2');
        wisebit.valuesToAgg('State1\nState2');
    }},
    {name: 'Rights', callback: function(wisebit) {
        
        wisebit.switchEngine("JSON");
        wisebit.addValues([
            {name: 'Read', base: 1 },
            {name: 'Write', base: 2 },
            {name: 'Manage', base: 4 },
            {name: 'Admin', base: 7 }
            ]);
        wisebit.valueToAgg('Editor');
        wisebit.valuesToAgg('Read\nWrite');
        
    }},
    {name: 'UNIX', callback: function(wisebit) {
        
        wisebit.switchEngine("JSON");
        wisebit.addValues([
            {name: 'Execute', base: 1 },
            {name: 'Write', base: 2 },
            {name: 'Read', base: 4 },
            {name: 'All', base: 7 }
            ]);
    }},
    {name: 'PHP Errors', callback: function(wisebit) {
        
        wisebit.switchEngine("JSON");
        wisebit.valuesToAdd("E_ERROR\nE_WARNING\nE_PARSE\nE_NOTICE\nE_CORE_ERROR\nE_CORE_WARNING\nE_COMPILE_ERROR\nE_COMPILE_WARNING\nE_USER_ERROR\nE_USER_WARNING\nE_USER_NOTICE\nE_STRICT\nE_RECOVERABLE_ERROR\nE_DEPRECATED\nE_USER_DEPRECATED\n");
        wisebit.valueToAgg("E_ALL");
        wisebit.valuesToAgg("*");
        wisebit.switchEngine("static");
        wisebit.engineParam("const");
        // http://php.net/manual/errorfunc.constants.php
        /*
        wisebit.addValues([
        {'base': 1, 'name': 'E_ERROR'},
        {'base': 2, 'name': 'E_WARNING'},
        {'base': 4, 'name': 'E_PARSE'},
        {'base': 8, 'name': 'E_NOTICE'},
        {'base': 16,    'name': 'E_CORE_ERROR'},
        {'base': 32,    'name': 'E_CORE_WARNING'},
        {'base': 64,    'name': 'E_COMPILE_ERROR'},
        {'base': 128,   'name': 'E_COMPILE_WARNING'},
        {'base': 256,   'name': 'E_USER_ERROR'},
        {'base': 512,   'name': 'E_USER_WARNING'},
        {'base': 1024,  'name': 'E_USER_NOTICE'},
        {'base': 2048,  'name': 'E_STRICT'},
        {'base': 4096,  'name': 'E_RECOVERABLE_ERROR'},
        {'base': 8192,  'name': 'E_DEPRECATED'},
        {'base': 16384, 'name': 'E_USER_DEPRECATED'},
        {'base': 32767, 'name': 'E_ALL'}
        ]);
        */

    }}
]);
