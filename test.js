var to, states = {
    openup: {},
    state1: {},
    state2: {
        substates: {
            operational: {}
        }
    }
};

states.state1.init = function () {
    to = 's1init';
}
states.state1.entry = function (params) {
    to += 's1entry';
    if (params) {
        to = params;
    }
}
states.state1.exit = function () {
    to = 's1exit';
}


test('statemashine basic steps', function () {
    var sm;
    ok(function () {
        sm = new EasyStateMachine(states);
        return typeof sm;
    }() === "object", 'StateMashine initialization');

    ok(function () {
        sm.state = 'openup';
        return sm.state.name
    }() === 'openup', 'Setting up first state');

    ok(function () {
        sm.state = 'state1';
        return to
    }() === 's1inits1entry', 'Moving to state with init and entry');

    ok(function () {
        sm.state = 'openup';
        return to
    }() === 's1exit', 'Leaving state');

    ok(function () {
        sm.state = 'state1';
        return to
    }() === 's1exits1entry', 'Moving to state with init and entry again');

    ok(function () {
        sm.states.openup.entry = function () {
            to = '';
        }
        sm.state = 'openup';
        return to;
    }() === '', 'Adding dynamic entry code and moving to a modified state');

    ok(function () {
        sm.loadStates("operational", {substates: {
                ss1: {},
                ss2: {}
            }
        });
        sm.states.operational.init = function () {
            to = 'oInit';
        }
        sm.states.ss1.init = function () {
            to += 'ss1Init';
        }
        sm.states.ss1.entry = function () {
            to += 'ss1Entry';
        }
        sm.state = 'ss1';

        return to;
    }() === 'oInitss1Initss1Entry', 'Adding dynamic states and moving to a new state');

    ok(function () {
        to = '';
        sm.states.ss1.exit = function () {
            to += 'ss1Exit';
        }
        sm.states.operational.exit = function () {
            to += 'operationalExit';
        }
        sm.states.state2.exit = function () {
            to += 's2Exit';
        }
        sm.state = 'state1';
        console.log(to);
        return to;
    }() === 'ss1ExitoperationalExits2Exits1entry', 'Going back to parent state');

    ok(function () {
        sm.states.ss2.entry = function (params) {
            to = params ? params.to : null;
        }

        var p = {};
        p.to = 123;
        sm.setState('ss2', p);

        return p.to;
    }() === to, 'Going to state with specified params by sm.setState command');
    
    ok(function () {
        var prevState = sm.state;
        sm.state = 'undefined_state';
        console.log('Current state is ' + sm.state.name);
        return prevState;
    }() === sm.state, 'Testing for go to undefined state');
    
    ok(!!function () {
        sm.loadStates("state6", {substates: {
                state6Do: {}
            },
            doIt: true
        }, 'init');

        sm.state = 'state6Do';

        console.log(to);

        return true;
    }(), 'Moving to a new dynamic state without init and entry functions');
    
    ok(function() {
        sm.setState('state1', 'check');
        console.log(to);
        return to;
    }() === 'check', 'Moving to a state with defined entry params in function params');

    ok(function() {
        sm.loadStates('state2', {}, 'state1');
            sm.setState('state2');
            sm.setState('state1');
        return true;
    }() === true, 'Moving to undefined state and returning to current state');

    ok(function() {
            sm.setState({});
            return true;
        }() === true, 'Moving to a state defined as a wrong objects');
});
test('Testing prototype properties', function() {
    var sm = new EasyStateMachine(states);
    sm.loadStates('init', {
        substates: {
            operational: {},
            state2: {
                substates: {
                    ss2: {}
                }
            }
        }});
    
    ok(function () {       
        sm.states.ss2.prop_ss2 = 12;
        sm.states.operational.prop_op = 14;
        sm.states.state2.st2_op = 'test';

        sm.state = 'ss2';
        console.log('Properties data: prop_ss2 = ' + sm.state.prop_ss2 + ', prop_op = ' + sm.state.prop_op + ', st2_op = ' + sm.state.st2_op);

        return sm.state.st2_op;
    }() === 'test', 'Testing  prototype properties');

    ok(!function () {
        sm.state = 'state2';
        console.log('Properties data: prop_ss2 = ' + sm.state.prop_ss2 + ', prop_op = ' + sm.state.prop_op + ', st2_op = ' + sm.state.st2_op);

        return sm.state.prop_ss2;
    }(), 'Testing  prototype properties 2');

    ok(function () {
        sm.state.state2_op = 'test2';
        sm.state = 'ss2';
        console.log('Properties data: prop_ss2 = ' + sm.state.prop_ss2 + ', prop_op = ' + sm.state.prop_op + ', st2_op = ' + sm.state.st2_op + ', state2_op = ' + sm.state.state2_op);
        return sm.state.state2_op;
    }() === 'test2', 'Testing  prototype properties 3: dynamic property add');

    ok(function () {
        sm.state.state2_op = 'test2_changed';
        sm.state = 'state2';
        console.log('Properties data: prop_ss2 = ' + sm.state.prop_ss2 + ', prop_op = ' + sm.state.prop_op + ', st2_op = ' + sm.state.st2_op + ', state2_op = ' + sm.state.state2_op);
        return sm.state.state2_op;
    }() !== 'test2_changed', 'Testing  prototype properties 4: dynamic property change');
});
test('Testing statePreProcessor and async calls', function(assert) {
    sm = new EasyStateMachine(states);
    
    ok(function () {
        to = '';

        function preProcess(stateName, substates) {
            if (substates.doIt) {
                substates.init = function () {
                    to += ' - ' + stateName + 'init';
                }
            }
            substates.entry = function () {
                to += ' - ' + stateName + 'entry';
            };
            substates.exit = function () {
                to += ' - ' + stateName + 'exit';
            };
            return substates;
        }

        sm.loadStates("state3", {substates: {
                stateDo: {doIt: true},
                stateNotDo: {}
            },
            doIt: true
        }, 'init', preProcess);

        sm.state = 'stateDo';
        sm.state = 'stateNotDo';

        console.log(to);

        return to;
    }() === ' - state3init - state3entry - stateDoinit - stateDoentry - stateDoexit - stateNotDoentry'
            , 'Testing dynamic state add with synchronous statePreProcessor');
            
    ok(function () {
        to = '';

        function preProcess(stateName, substates, aCallback) {
            if (substates.doIt) {
                substates.init = function () {
                    to += ' - ' + stateName + 'init';
                };
            }
            substates.entry = function () {
                to += ' - ' + stateName + 'entry';
            };
            substates.exit = function () {
                to += ' - ' + stateName + 'exit';
            };
            aCallback(substates); return;
        }

        sm.loadStates("state4", {substates: {
                state4Do: {doIt: true},
                state4NotDo: {}
            },
            doIt: true
        }, 'init', preProcess);

        sm.state = 'state4Do';
        sm.state = 'state4NotDo';

        console.log(to);

        return to;
    }() === ' - stateNotDoexit - state3exit - state4init - state4entry - state4Doinit - state4Doentry - state4Doexit - state4NotDoentry'
            , 'Testing dynamic state add with Asynchronous statePreProcessor');
    
    var done1 = assert.async();
    var done2 = assert.async();
    var tst1 = "";
    var tst2 = "";
    sm.loadStates("state6", {}, 'init');
    
    sm.states.state6.init = function(params, aCallback) {
        setTimeout(function() {
            tst1 += "init";
            if (aCallback)
                aCallback();
        }, 1500);
    };
    
    sm.states.state6.init.async = true;
    
    sm.states.state6.entry = function() {
            tst1 += "entry";
            assert.equal(tst1, 'initentry', 'Testing for async init for one state');
            sm.state = 'state7';
            done1();
    };
    
    sm.state = 'state6';
    
    sm.loadStates("state7", {
        substates: {
            state7_1: {
                substates: {
                    state7_1_1: {}
                }
            }
        }
    }, 'init');
    
    sm.states.state7.init = function(params, aCallback) {
        setTimeout(function() {
            tst2 += "state7init";
            if (aCallback)
                aCallback();
        }, 2500);
    };    
    sm.states.state6.init.async = true;
    
    sm.states.state7.init = function(params, aCallback) {
        setTimeout(function() {
            tst2 += "state7init";
            if (aCallback)
                aCallback();
        }, 2500);
    };
    
    sm.states.state7.entry = function() {
            tst2 += "state7entry";
    };
    
    sm.states.state7_1.init = function(params, aCallback) {
        setTimeout(function() {
            tst2 += "state7_1init";
            if (aCallback)
                aCallback();
        }, 1500);
    };
    
    sm.states.state7_1.entry = function() {
            tst2 += "state7_1entry";
    };
    
    sm.states.state7_1_1.init = function(params, aCallback) {
        setTimeout(function() {
            tst2 += "state7_1_1init";
            if (aCallback)
                aCallback();
        }, 500);
    };
    
    sm.states.state7_1.entry = function() {
            tst2 += "state7_1_1entry";
            console.log(tst2);
            assert.equal(tst2, 'state7initstate7entrystate7_1initstate7_1entrystate7_1_1init'
                        , 'Testing for async init for multiple states');
            done1();
            
    };
    sm.states.state7.init.async =
            sm.states.state7_1.init.async =
            sm.states.state7_1_1.init.async = true;
    
    sm.state = 'state6';
    
    
    
//    setTimeout(function() {
//        
//    }, 1500)
//    test( "async init", function (assert) {
//
//        sm.state = 'state6Do';
//
//        console.log(to);
//
//        done1();
//    });//, 'Moving to a new dynamic state without init and entry functions');   
    
});