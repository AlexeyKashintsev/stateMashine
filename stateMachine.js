/**
 * @author Alexey Kashintsev
 */
(function () {
    function EasyStateMachine(aStates, aStatePreProcessor) {
        var sm = this;
        var states = {};
        sm.states = states;
        var currentState, prevState;
        var history = [];
        var statePreProcessor = aStatePreProcessor ? aStatePreProcessor : null;

        /**
         * @param aState - экземпляр состояния или название состояния
         * @returns Если на вход дано состояние, то возвращает его, а если название состояния,
         * то если оно существует - возвращает состояние, иначе undefined
         */
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
                get: function () {
                    return entry;
                },
                set: function (aFunct) {
                    entry = aFunct ? function (params) {
                        var p = params ? params : (state.eParams ? state.eParams : null);
                        function entry() {
                            aFunct(p);
                            state.eParams = null;
                        }
                        if (!inititalized && init) {
                            if (!init.async) {
                                init();
                                entry();
                            } else {
                                init(entry);
                            }
                        } else
                            entry();

                    } : init;
                }
            });
            Object.defineProperty(state, "init", {
                get: function () {
                    return init;
                },
                set: function (aFunct) {
                    init = aFunct ? function (aCallback) {
                        inititalized = true;
                        aFunct(state.iParams ? state.iParams : null, init.async ? aCallback : null);
                    } : null;
                    if (!entry)
                        entry = init; //Вот это под вопросом! Хотя и ломает тесты
                }
            });
            Object.defineProperty(state, "exit", {
                get: function () {
                    return exit;
                },
                set: function (aFunct) {
                    exit = aFunct;
                }
            });
            Object.defineProperty(state, "parent", {
                get: function () {
                    return parent;
                },
                set: function (aParent) {
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

            state.addChild = function (childState) {
                state.childs.push(childState);
            };
            state.deleteChild = function (childState) {
                //            TODO
            };

            state.hasState = function (aState) {
                aState = nState(aState);
                var path = state.getPath();
                var res = false;
                path.forEach(function (state) {
                    if (state === aState)
                        res = true;
                });
                return res;
            };

            state.getPath = function () {
                if (!state.parent)
                    return [this];
                else {
                    var ar = state.parent.getPath();
                    ar.push(state);
                    return ar;
                }
            };

            state.activate = function () {
                sm.setState(state);
            };
        };

        function addState(aStateName, aStateParent, EnterAction, ExitAction, InitAction) {
            var parent = aStateParent ?
                    (typeof aStateParent === 'object' ? aStateParent : states[aStateParent])
                    : null;
            var e = State;
            e.prototype = parent;
            states[aStateName] = new e(aStateName, parent, EnterAction, ExitAction, InitAction);
            //        if (parent)
            //            parent.addChild(states[aStateName]);
            return states[aStateName];
        };


        var stateChange = false;
        var stateQueue = [];
        function setState(aNewState, eParams) {
            var state = nState(aNewState);
            if (!state) {
                console.log('Error! The state is not defined! State: ' + aNewState);
                return false;
            }

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
                        }
                ;
                leavePath.splice(0, lMax);
                entryPath.splice(0, eMax);

                while (leavePath.length) {
                    var ls = leavePath.pop();
                    if (ls.exit) {
                        ls.exit();
                    }
                }
                
                function entry(aState, anEntryStatesAr) {
                    if (aState.entry)
                        aState.entry();
                    currentState = aState;
                    if (anEntryStatesAr.length) {
                        entry(anEntryStatesAr.shift(), anEntryStatesAr);
                    }
                }
                if (entryPath.length) {
                    entry(entryPath.shift(), entryPath);
                }

                currentState = state;
                history.push(currentState);
                stateChange = false;
                processQueue();
            }
            return true;
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
        function createStates(aState, aSubstatesAr, aParentState, aPreProcessor) {
            function createState(aSubstates) {
                var sState = eSt ? eSt : addState(aState, aParentState, aSubstates.entry, aSubstates.exit, aSubstates.init);
                for (var j in aSubstates.substates)
                    createStates(j, aSubstates.substates[j], sState, aPreProcessor);
            }

            var eSt = nState(aState);
            if (!eSt && (statePreProcessor || aPreProcessor)) {
                var res = (aPreProcessor ? aPreProcessor : statePreProcessor)(aState, aSubstatesAr, createState);
                if (res)
                    createState(res);
            } else {
                createState(aSubstatesAr);
            }
        }

        if (aStates)
            createStates("init", {substates: aStates});

        Object.defineProperty(sm, 'state', {
            get: function () {
                return currentState;
            },
            set: setState
        });

        sm.addState = addState;
        sm.setState = setState;
        sm.loadStates = createStates;
        sm.goBack = function () {
            sm.setState(prevState);
        };
    }

    EasyStateMachine.attach = function (aStates) {
        return new EasyStateMachine(aStates);
    };

    if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {

        // AMD. Register as an anonymous module.
        /**
         * @module EasyStateMachine
         */
        define(function () {
            return EasyStateMachine;
        });
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports = EasyStateMachine.attach;
        module.exports.EasyStateMachine = EasyStateMachine;
    } else {
        window.EasyStateMachine = EasyStateMachine;
    }
})();