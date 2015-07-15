
A quick and easy-to-use tool to create lists of bits to use in rights management or whatever you find it useful for


Originally drafted on [JSBin](http://jsbin.com/), then put on [GitHub Wisebit repo](https://github.com/sherbrow/wisebit).

By [@Sherbrow](https://twitter.com/Sherbrow).

Using [Knockout.js](http://knockoutjs.com).

```
wisebit.switchEngine("Engine Name");

wisebit.registerEngine("Engine Name", function(
  // `this` is the wisebit viewmodel
  values // [ { name: "State", base: 2 }, ... ]
  // `this.keyedValues` = { "State": 2, ... }
) { return "string"; });

wisebit.addValue("State");

wisebit.addValues([ { name: "State", base: 2 }, ... ]);

wisebit.examples.push({ name: "Ex1", callback: function(wisebit){}});

wisebit.reset();

```