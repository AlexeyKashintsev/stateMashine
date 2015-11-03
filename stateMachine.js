function EasyStateMachine(aStates) {
    var sm = this;
    var states = {};
    sm.states = states;
    var currentState, prevState;
    var history = [];
    
    function nState(aState) {
        return typeof aState === 'object' ? aState : states[aState];
    }
    
    function State(aName, aParent, anEnter, anExit, anInit) {
        var entry, exit, init, parent;
        var state = this;
        var inititalized = false;
        this.name = aName;
        this.childs = [];
        
        Object.defineProperty(state, "entry", {
            get: function() { return entry; },
            set: function(aFunct) { entry = aFunct ? function() {
                    if (!inititalized && init)
                        init();
                    aFunct(state.eParams ? state.eParams : null);
                    state.eParams = null;
                } : init;
            }
        });
        Object.defineProperty(state, "init", {
            get: function() { return init; },
            set: function(aFunct) { init = aFunct ? function() {
                    inititalized = true;
                    aFunct(state.iParams ? state.iParams : null);
                } : null;
                if (!entry)
                    entry = init;
            }
        });
        Object.defineProperty(state, "exit", {
            get: function() { return exit; },
            set: function(aFunct) { exit = aFunct; }
        });
        Object.defineProperty(state, "parent", {
            get: function() { return parent; },
            set: function(aParent) {
                if (parent)
                    parent.deleteChild(state);
                parent = aParent;
                if (parent)
                    parent.addChild(state);
            }
        });
        
        state.entry = anEnter;
        state.exit = anExit;
        state.init = anInit;
        state.parent = nState(aParent);
        
        state.addChild = function(childState) {
            state.childs.push(childState);
        };
        state.deleteChild = function(childState) {
//            TODO
        };
        
        state.hasState = function(aState) {
            aState = nState(aState);
            var path = state.getPath();
            var res = false;
            path.forEach(function(state) {
                if (state === aState)
                    res = true;
            });
            return res;
        };
        
        state.getPath = function() {
            if (!state.parent)
                return [this];
            else {
                var ar = state.parent.getPath();
                ar.push(state);
                return ar;
            }
        };
        
        state.activate = function() {
            sm.setState(state);
        };
    };
    
    function addState(aStateName, aStateParent, EnterAction, ExitAction, InitAction) {
        var parent = aStateParent ? 
                        (typeof aStateParent === 'object' ? aStateParent : states[aStateParent])
                        : null;
        states[aStateName] = new State(aStateName, parent, EnterAction, ExitAction, InitAction);
//        if (parent)
//            parent.addChild(states[aStateName]);
        return states[aStateName];
    };
    
    
    var stateChange = false;
    var stateQueue = [];
    function setState(aNewState, eParams) {
        var state = nState(aNewState);
        prevState = currentState;
        if (eParams) {
            state.eParams = eParams;
        }
        
        if (stateChange) {
            stateQueue.push(state);
        } else {
            stateChange = true;
            var leavePath = currentState ? currentState.getPath() : [];
            var entryPath = state.getPath();

            var lMax = 0, eMax = 0;
            for (var j in leavePath)
                for (var i in entryPath)
                    if (leavePath[j] === entryPath[i]) {
                        lMax = +j + 1;
                        eMax = +i + 1;
                    };
            leavePath.splice(0, lMax);
            entryPath.splice(0, eMax);
            
//            leavePath.forEach(function(state) {
//                if (state.entry)
//                    state.entry();
//            });
            
            var lpMax = leavePath.length - 1;
            for (var j=lpMax;j >= 0; j--) {
                if (leavePath[j].exit)
                    leavePath[j].exit();
            }
            
            entryPath.forEach(function(state) {
                if (state.entry)
                    state.entry();
                currentState = state;
            });
            
            currentState = state;
            history.push(currentState);
            stateChange = false;
            processQueue();
        }
    };
    
    function processQueue() {
        while (stateQueue.length > 0) {
            sm.setState(stateQueue.shift());
        }
    }
    
    /**
     * 
     * @param {type} aState - наименование нового состояния или существующиее состояние
     * @param {type} aSubstatesAr - массив подсостояний
     * @param {type} aParentState - родительское состояние
     * @returns {undefined}
     */
    function createStates(aState, aSubstatesAr, aParentState) {
        var eSt = nState(aState);
        var sState = eSt ? eSt : addState(aState, aParentState, aSubstatesAr.entry, aSubstatesAr.exit, aSubstatesAr.init);
        for (var j in aSubstatesAr.substates)
            createStates(j, aSubstatesAr.substates[j], sState);
    }
    
    if (aStates)
        createStates("init", {substates: aStates});
    
    Object.defineProperty(sm, 'state', {
        get: function() {
            return currentState;
        },
        set: setState
    });
    
    sm.addState = addState;
    sm.setState = setState;    
    sm.loadStates = createStates;
    sm.goBack = function() {
        sm.setState(prevState);
    };
}