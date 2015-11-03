var to, sm, states = {
        openup: {},
        state1: {},
        state2: {
            substates: {
                operational: {}
            }
        }
    };
    
    states.state1.init = function() {
        to = 's1init';
    }
    states.state1.entry = function() {
        to += 's1entry';
    }
    states.state1.exit = function() {
        to = 's1exit';
    }
    

test('statemashine', function () {    
    ok(function() {
        sm = new EasyStateMachine(states);
        return typeof sm;
    }() === "object", 'StateMashine initialization');
    
    ok(function() {
        sm.state = 'openup';
        return sm.state.name
    }() === 'openup', 'Setting up first state');
    
    ok(function() {
        sm.state = 'state1';
        return to
    }() === 's1inits1entry', 'Moving to state with init and entry');
    
    ok(function() {
        sm.state = 'openup';
        return to
    }() === 's1exit', 'Leaving state');
    
    ok(function() {
        sm.state = 'state1';
        return to
    }() === 's1exits1entry', 'Moving to state with init and entry again');
    
    ok(function() {
        sm.states.openup.entry = function() {
            to = '';
        }
        sm.state = 'openup';
        return to;
    }() === '', 'Adding dynamic entry code and moving to a modified state');
    
    ok(function() {
        sm.loadStates("operational", {substates: {
                ss1: {},
                ss2: {}
            }
        });
        sm.states.operational.init = function() {
            to = 'oInit';
        }
        sm.states.ss1.init = function() {
            to += 'ss1Init';
        }
        sm.states.ss1.entry = function() {
            to += 'ss1Entry';
        }
        sm.state = 'ss1';
        
        return to;
    }() === 'oInitss1Initss1Entry', 'Adding dynamic states and moving to a new state');
    
    ok(function() {
        to = '';
        sm.states.ss1.exit = function() {
            to += 'ss1Exit';
        }
        sm.states.operational.exit = function() {
            to += 'operationalExit';
        }
        sm.states.state2.exit = function() {
            to += 's2Exit';
        }
        sm.state = 'state1';
        console.log(to);
        return to;
    }() === 'ss1ExitoperationalExits2Exits1entry', 'Going back to parent state');
    
    ok(function() {
        sm.states.ss2.entry = function(params) {
            to = params ? params.to : null;
        }
        
        var p = {};
        p.to = 123;
        sm.setState('ss2', p);
        
        return p.to;
    }() === to, 'Going to state with specified params by sm.setState command');
});