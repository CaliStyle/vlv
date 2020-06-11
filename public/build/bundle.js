
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src/Components/Navbar/Navbar.svelte generated by Svelte v3.16.7 */

    const { console: console_1 } = globals;
    const file = "src/Components/Navbar/Navbar.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    // (26:8) {#each navlists as list}
    function create_each_block(ctx) {
    	let li;
    	let a;
    	let t0_value = /*list*/ ctx[2].label + "";
    	let t0;
    	let a_href_value;
    	let t1;

    	const block = {
    		c: function create() {
    			li = element("li");
    			a = element("a");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(a, "class", "nav-link light-color svelte-z4knur");
    			attr_dev(a, "href", a_href_value = /*list*/ ctx[2].url);
    			add_location(a, file, 27, 12, 849);
    			attr_dev(li, "class", "nav-item svelte-z4knur");
    			add_location(li, file, 26, 10, 815);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, a);
    			append_dev(a, t0);
    			append_dev(li, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*navlists*/ 1 && t0_value !== (t0_value = /*list*/ ctx[2].label + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*navlists*/ 1 && a_href_value !== (a_href_value = /*list*/ ctx[2].url)) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(26:8) {#each navlists as list}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let section;
    	let nav;
    	let a;
    	let t0;
    	let t1;
    	let button;
    	let span;
    	let t2;
    	let div;
    	let ul;
    	let each_value = /*navlists*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			section = element("section");
    			nav = element("nav");
    			a = element("a");
    			t0 = text(/*header*/ ctx[1]);
    			t1 = space();
    			button = element("button");
    			span = element("span");
    			t2 = space();
    			div = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(a, "class", "navbar-brand company_brand");
    			attr_dev(a, "href", "/");
    			add_location(a, file, 10, 4, 328);
    			attr_dev(span, "class", "navbar-toggler-icon");
    			add_location(span, file, 21, 6, 625);
    			attr_dev(button, "class", "navbar-toggler");
    			attr_dev(button, "type", "button");
    			attr_dev(button, "data-toggle", "collapse");
    			attr_dev(button, "data-target", "#navbarNav");
    			attr_dev(button, "aria-controls", "navbarNav");
    			attr_dev(button, "aria-expanded", "false");
    			attr_dev(button, "aria-label", "Toggle navigation");
    			add_location(button, file, 13, 4, 404);
    			attr_dev(ul, "class", "navbar-nav ml-auto svelte-z4knur");
    			add_location(ul, file, 24, 6, 740);
    			attr_dev(div, "class", "collapse navbar-collapse");
    			attr_dev(div, "id", "navbarNav");
    			add_location(div, file, 23, 4, 680);
    			attr_dev(nav, "class", "navbar main-bgcolor navbar-expand-md navbar-dark svelte-z4knur");
    			add_location(nav, file, 9, 2, 261);
    			attr_dev(section, "id", "nav-bar");
    			attr_dev(section, "class", "svelte-z4knur");
    			add_location(section, file, 8, 0, 236);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, nav);
    			append_dev(nav, a);
    			append_dev(a, t0);
    			append_dev(nav, t1);
    			append_dev(nav, button);
    			append_dev(button, span);
    			append_dev(nav, t2);
    			append_dev(nav, div);
    			append_dev(div, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*header*/ 2) set_data_dev(t0, /*header*/ ctx[1]);

    			if (dirty & /*navlists*/ 1) {
    				each_value = /*navlists*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { navlists = [] } = $$props;
    	let { header } = $$props;
    	console.log(navlists);
    	const writable_props = ["navlists", "header"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Navbar> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("navlists" in $$props) $$invalidate(0, navlists = $$props.navlists);
    		if ("header" in $$props) $$invalidate(1, header = $$props.header);
    	};

    	$$self.$capture_state = () => {
    		return { navlists, header };
    	};

    	$$self.$inject_state = $$props => {
    		if ("navlists" in $$props) $$invalidate(0, navlists = $$props.navlists);
    		if ("header" in $$props) $$invalidate(1, header = $$props.header);
    	};

    	return [navlists, header];
    }

    class Navbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { navlists: 0, header: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Navbar",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*header*/ ctx[1] === undefined && !("header" in props)) {
    			console_1.warn("<Navbar> was created without expected prop 'header'");
    		}
    	}

    	get navlists() {
    		throw new Error("<Navbar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set navlists(value) {
    		throw new Error("<Navbar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get header() {
    		throw new Error("<Navbar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set header(value) {
    		throw new Error("<Navbar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Components/Banner/Banner.svelte generated by Svelte v3.16.7 */

    const file$1 = "src/Components/Banner/Banner.svelte";

    function create_fragment$1(ctx) {
    	let section;
    	let div3;
    	let div2;
    	let div0;
    	let h1;
    	let t1;
    	let p;
    	let t3;
    	let a;
    	let i;
    	let t4;
    	let t5;
    	let t6;
    	let div1;
    	let img0;
    	let img0_src_value;
    	let t7;
    	let img1;
    	let img1_src_value;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = `${/*HEADING*/ ctx[0]}`;
    			t1 = space();
    			p = element("p");
    			p.textContent = `${/*DECRIPTION*/ ctx[1]}`;
    			t3 = space();
    			a = element("a");
    			i = element("i");
    			t4 = space();
    			t5 = text(/*WATCH_TUTORIAL*/ ctx[3]);
    			t6 = space();
    			div1 = element("div");
    			img0 = element("img");
    			t7 = space();
    			img1 = element("img");
    			attr_dev(h1, "class", "svelte-1op4mlb");
    			add_location(h1, file$1, 11, 8, 408);
    			add_location(p, file$1, 12, 8, 435);
    			attr_dev(i, "class", "far fa-play-circle fa-2x watch-btn svelte-1op4mlb");
    			add_location(i, file$1, 14, 10, 533);
    			attr_dev(a, "href", /*TUTORIAL_URL*/ ctx[2]);
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "class", "light-color svelte-1op4mlb");
    			add_location(a, file$1, 13, 8, 463);
    			attr_dev(div0, "class", "col-md-6");
    			add_location(div0, file$1, 10, 6, 377);
    			if (img0.src !== (img0_src_value = "images/home.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			attr_dev(img0, "class", "img-fluid");
    			add_location(img0, file$1, 19, 8, 672);
    			attr_dev(div1, "class", "col-md-6");
    			add_location(div1, file$1, 18, 6, 641);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file$1, 9, 4, 353);
    			attr_dev(div3, "class", "container");
    			add_location(div3, file$1, 8, 2, 325);
    			if (img1.src !== (img1_src_value = "images/wave1.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			attr_dev(img1, "class", "wave-img svelte-1op4mlb");
    			add_location(img1, file$1, 23, 2, 762);
    			attr_dev(section, "class", "main-bgcolor light-color svelte-1op4mlb");
    			attr_dev(section, "id", "banner");
    			add_location(section, file$1, 7, 0, 268);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, h1);
    			append_dev(div0, t1);
    			append_dev(div0, p);
    			append_dev(div0, t3);
    			append_dev(div0, a);
    			append_dev(a, i);
    			append_dev(a, t4);
    			append_dev(a, t5);
    			append_dev(div2, t6);
    			append_dev(div2, div1);
    			append_dev(div1, img0);
    			append_dev(section, t7);
    			append_dev(section, img1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { bannerData = {} } = $$props;
    	const { HEADING, DECRIPTION, TUTORIAL_URL, WATCH_TUTORIAL } = bannerData;
    	const writable_props = ["bannerData"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Banner> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("bannerData" in $$props) $$invalidate(4, bannerData = $$props.bannerData);
    	};

    	$$self.$capture_state = () => {
    		return { bannerData };
    	};

    	$$self.$inject_state = $$props => {
    		if ("bannerData" in $$props) $$invalidate(4, bannerData = $$props.bannerData);
    	};

    	return [HEADING, DECRIPTION, TUTORIAL_URL, WATCH_TUTORIAL, bannerData];
    }

    class Banner extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { bannerData: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Banner",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get bannerData() {
    		throw new Error("<Banner>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bannerData(value) {
    		throw new Error("<Banner>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Components/Services/Services.svelte generated by Svelte v3.16.7 */

    const file$2 = "src/Components/Services/Services.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (13:6) {#each SERVICE_LIST as list}
    function create_each_block$1(ctx) {
    	let div;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t0;
    	let h4;
    	let t1_value = /*list*/ ctx[4].LABEL + "";
    	let t1;
    	let t2;
    	let p;
    	let t3_value = /*list*/ ctx[4].DESCRIPTION + "";
    	let t3;
    	let t4;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			t0 = space();
    			h4 = element("h4");
    			t1 = text(t1_value);
    			t2 = space();
    			p = element("p");
    			t3 = text(t3_value);
    			t4 = space();
    			if (img.src !== (img_src_value = /*list*/ ctx[4].URL)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*list*/ ctx[4].LABEL);
    			attr_dev(img, "class", "service-img svelte-lks6f3");
    			add_location(img, file$2, 14, 10, 491);
    			attr_dev(h4, "class", "svelte-lks6f3");
    			add_location(h4, file$2, 15, 10, 561);
    			add_location(p, file$2, 16, 10, 593);
    			attr_dev(div, "class", "col-md-4 service svelte-lks6f3");
    			add_location(div, file$2, 13, 8, 450);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    			append_dev(div, t0);
    			append_dev(div, h4);
    			append_dev(h4, t1);
    			append_dev(div, t2);
    			append_dev(div, p);
    			append_dev(p, t3);
    			append_dev(div, t4);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(13:6) {#each SERVICE_LIST as list}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let section;
    	let div1;
    	let h2;
    	let t1;
    	let div0;
    	let t2;
    	let buttom;
    	let each_value = /*SERVICE_LIST*/ ctx[2];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			section = element("section");
    			div1 = element("div");
    			h2 = element("h2");
    			h2.textContent = `${/*HEADING*/ ctx[0]}`;
    			t1 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			buttom = element("buttom");
    			buttom.textContent = `${/*ALL_SERVICES*/ ctx[1]}`;
    			attr_dev(h2, "class", "title svelte-lks6f3");
    			add_location(h2, file$2, 10, 4, 339);
    			attr_dev(div0, "class", "row section-body");
    			add_location(div0, file$2, 11, 4, 376);
    			attr_dev(buttom, "class", "btn btn-primary round-border main-bgcolor svelte-lks6f3");
    			add_location(buttom, file$2, 20, 4, 663);
    			attr_dev(div1, "class", "container text-center");
    			add_location(div1, file$2, 9, 2, 299);
    			attr_dev(section, "id", "services");
    			attr_dev(section, "class", "section svelte-lks6f3");
    			add_location(section, file$2, 8, 0, 257);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div1);
    			append_dev(div1, h2);
    			append_dev(div1, t1);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append_dev(div1, t2);
    			append_dev(div1, buttom);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*SERVICE_LIST*/ 4) {
    				each_value = /*SERVICE_LIST*/ ctx[2];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { serviceData = {} } = $$props;
    	const { HEADING, ALL_SERVICES, SERVICE_LIST } = serviceData;
    	const writable_props = ["serviceData"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Services> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("serviceData" in $$props) $$invalidate(3, serviceData = $$props.serviceData);
    	};

    	$$self.$capture_state = () => {
    		return { serviceData };
    	};

    	$$self.$inject_state = $$props => {
    		if ("serviceData" in $$props) $$invalidate(3, serviceData = $$props.serviceData);
    	};

    	return [HEADING, ALL_SERVICES, SERVICE_LIST, serviceData];
    }

    class Services extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { serviceData: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Services",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get serviceData() {
    		throw new Error("<Services>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set serviceData(value) {
    		throw new Error("<Services>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Components/About/About.svelte generated by Svelte v3.16.7 */

    const file$3 = "src/Components/About/About.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (15:10) {#each WHY_CHOOSE_US_LIST as list}
    function create_each_block$2(ctx) {
    	let li;
    	let t_value = /*list*/ ctx[5] + "";
    	let t;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t = text(t_value);
    			attr_dev(li, "class", "svelte-lcl9qq");
    			add_location(li, file$3, 15, 12, 569);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(15:10) {#each WHY_CHOOSE_US_LIST as list}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let section;
    	let div3;
    	let h2;
    	let t1;
    	let div2;
    	let div0;
    	let h3;
    	let t3;
    	let ul;
    	let t4;
    	let div1;
    	let img;
    	let img_src_value;
    	let each_value = /*WHY_CHOOSE_US_LIST*/ ctx[3];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			section = element("section");
    			div3 = element("div");
    			h2 = element("h2");
    			h2.textContent = `${/*HEADING*/ ctx[0]}`;
    			t1 = space();
    			div2 = element("div");
    			div0 = element("div");
    			h3 = element("h3");
    			h3.textContent = `${/*TITLE*/ ctx[1]}`;
    			t3 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t4 = space();
    			div1 = element("div");
    			img = element("img");
    			attr_dev(h2, "class", "title text-center");
    			add_location(h2, file$3, 9, 4, 345);
    			attr_dev(h3, "class", "about-title svelte-lcl9qq");
    			add_location(h3, file$3, 12, 8, 462);
    			attr_dev(ul, "class", "svelte-lcl9qq");
    			add_location(ul, file$3, 13, 8, 507);
    			attr_dev(div0, "class", "col-md-6");
    			add_location(div0, file$3, 11, 6, 431);
    			if (img.src !== (img_src_value = /*IMAGE_URL*/ ctx[2])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			attr_dev(img, "class", "img-fluid");
    			add_location(img, file$3, 20, 8, 667);
    			attr_dev(div1, "class", "col-md-6");
    			add_location(div1, file$3, 19, 6, 636);
    			attr_dev(div2, "class", "row section-body");
    			add_location(div2, file$3, 10, 4, 394);
    			attr_dev(div3, "class", "container");
    			add_location(div3, file$3, 8, 2, 317);
    			attr_dev(section, "id", "about-us");
    			attr_dev(section, "class", "section grey-bgcolor svelte-lcl9qq");
    			add_location(section, file$3, 7, 0, 262);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div3);
    			append_dev(div3, h2);
    			append_dev(div3, t1);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, h3);
    			append_dev(div0, t3);
    			append_dev(div0, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			append_dev(div1, img);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*WHY_CHOOSE_US_LIST*/ 8) {
    				each_value = /*WHY_CHOOSE_US_LIST*/ ctx[3];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { aboutData = {} } = $$props;
    	const { HEADING, TITLE, IMAGE_URL, WHY_CHOOSE_US_LIST } = aboutData;
    	const writable_props = ["aboutData"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<About> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("aboutData" in $$props) $$invalidate(4, aboutData = $$props.aboutData);
    	};

    	$$self.$capture_state = () => {
    		return { aboutData };
    	};

    	$$self.$inject_state = $$props => {
    		if ("aboutData" in $$props) $$invalidate(4, aboutData = $$props.aboutData);
    	};

    	return [HEADING, TITLE, IMAGE_URL, WHY_CHOOSE_US_LIST, aboutData];
    }

    class About extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { aboutData: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "About",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get aboutData() {
    		throw new Error("<About>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set aboutData(value) {
    		throw new Error("<About>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Components/Testimonials/Testimonials.svelte generated by Svelte v3.16.7 */

    const file$4 = "src/Components/Testimonials/Testimonials.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (13:6) {#each TESTIMONIAL_LIST as list}
    function create_each_block$3(ctx) {
    	let div;
    	let p0;
    	let t0_value = /*list*/ ctx[3].DESCRIPTION + "";
    	let t0;
    	let t1;
    	let img;
    	let img_src_value;
    	let t2;
    	let p1;
    	let b;
    	let t3_value = /*list*/ ctx[3].NAME + "";
    	let t3;
    	let t4;
    	let br;
    	let t5;
    	let t6_value = /*list*/ ctx[3].DESIGNATION + "";
    	let t6;
    	let t7;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p0 = element("p");
    			t0 = text(t0_value);
    			t1 = space();
    			img = element("img");
    			t2 = space();
    			p1 = element("p");
    			b = element("b");
    			t3 = text(t3_value);
    			t4 = space();
    			br = element("br");
    			t5 = space();
    			t6 = text(t6_value);
    			t7 = space();
    			add_location(p0, file$4, 14, 10, 510);
    			if (img.src !== (img_src_value = /*list*/ ctx[3].IMAGE_URL)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			attr_dev(img, "class", "svelte-1xpi47k");
    			add_location(img, file$4, 15, 10, 546);
    			add_location(b, file$4, 17, 12, 629);
    			add_location(br, file$4, 18, 12, 660);
    			attr_dev(p1, "class", "user-details svelte-1xpi47k");
    			add_location(p1, file$4, 16, 10, 592);
    			attr_dev(div, "class", "col-md-5 testimonial svelte-1xpi47k");
    			add_location(div, file$4, 13, 8, 465);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p0);
    			append_dev(p0, t0);
    			append_dev(div, t1);
    			append_dev(div, img);
    			append_dev(div, t2);
    			append_dev(div, p1);
    			append_dev(p1, b);
    			append_dev(b, t3);
    			append_dev(p1, t4);
    			append_dev(p1, br);
    			append_dev(p1, t5);
    			append_dev(p1, t6);
    			append_dev(div, t7);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(13:6) {#each TESTIMONIAL_LIST as list}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let section;
    	let div1;
    	let h2;
    	let t1;
    	let div0;
    	let each_value = /*TESTIMONIAL_LIST*/ ctx[1];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			section = element("section");
    			div1 = element("div");
    			h2 = element("h2");
    			h2.textContent = `${/*HEADING*/ ctx[0]}`;
    			t1 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h2, "class", "title text-center");
    			add_location(h2, file$4, 10, 4, 329);
    			attr_dev(div0, "class", "row offset-1 section-body");
    			add_location(div0, file$4, 11, 4, 378);
    			attr_dev(div1, "class", "container");
    			add_location(div1, file$4, 9, 2, 301);
    			attr_dev(section, "id", "testimonials");
    			attr_dev(section, "class", "section");
    			add_location(section, file$4, 8, 0, 255);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div1);
    			append_dev(div1, h2);
    			append_dev(div1, t1);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*TESTIMONIAL_LIST*/ 2) {
    				each_value = /*TESTIMONIAL_LIST*/ ctx[1];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { testimonialData = {} } = $$props;
    	const { HEADING, TESTIMONIAL_LIST } = testimonialData;
    	const writable_props = ["testimonialData"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Testimonials> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("testimonialData" in $$props) $$invalidate(2, testimonialData = $$props.testimonialData);
    	};

    	$$self.$capture_state = () => {
    		return { testimonialData };
    	};

    	$$self.$inject_state = $$props => {
    		if ("testimonialData" in $$props) $$invalidate(2, testimonialData = $$props.testimonialData);
    	};

    	return [HEADING, TESTIMONIAL_LIST, testimonialData];
    }

    class Testimonials extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { testimonialData: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Testimonials",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get testimonialData() {
    		throw new Error("<Testimonials>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set testimonialData(value) {
    		throw new Error("<Testimonials>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Components/Social/Social.svelte generated by Svelte v3.16.7 */

    const file$5 = "src/Components/Social/Social.svelte";

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (12:6) {#each IMAGES_LIST as list}
    function create_each_block$4(ctx) {
    	let a;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t;

    	const block = {
    		c: function create() {
    			a = element("a");
    			img = element("img");
    			t = space();
    			if (img.src !== (img_src_value = /*list*/ ctx[3])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = "Social media " + /*list*/ ctx[3]);
    			attr_dev(img, "class", "svelte-tq0cc6");
    			add_location(img, file$5, 15, 10, 578);
    			attr_dev(a, "href", "https://www.linkedin.com/in/nikhil-karkra-73a15319/");
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "class", "svelte-tq0cc6");
    			add_location(a, file$5, 12, 8, 469);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, img);
    			append_dev(a, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$4.name,
    		type: "each",
    		source: "(12:6) {#each IMAGES_LIST as list}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let section;
    	let div1;
    	let h2;
    	let t1;
    	let div0;
    	let each_value = /*IMAGES_LIST*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			section = element("section");
    			div1 = element("div");
    			h2 = element("h2");
    			h2.textContent = `${/*HEADING*/ ctx[1]}`;
    			t1 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h2, "class", "title text-center");
    			add_location(h2, file$5, 9, 4, 338);
    			attr_dev(div0, "class", "social-icons section-body svelte-tq0cc6");
    			add_location(div0, file$5, 10, 4, 387);
    			attr_dev(div1, "class", "container text-center");
    			add_location(div1, file$5, 8, 2, 298);
    			attr_dev(section, "id", "social-media");
    			attr_dev(section, "class", "section grey-bgcolor");
    			add_location(section, file$5, 7, 0, 239);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div1);
    			append_dev(div1, h2);
    			append_dev(div1, t1);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*IMAGES_LIST*/ 1) {
    				each_value = /*IMAGES_LIST*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$4(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$4(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { socialData = {} } = $$props;
    	const { IMAGES_LIST, HEADING } = socialData;
    	const writable_props = ["socialData"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Social> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("socialData" in $$props) $$invalidate(2, socialData = $$props.socialData);
    	};

    	$$self.$capture_state = () => {
    		return { socialData };
    	};

    	$$self.$inject_state = $$props => {
    		if ("socialData" in $$props) $$invalidate(2, socialData = $$props.socialData);
    	};

    	return [IMAGES_LIST, HEADING, socialData];
    }

    class Social extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { socialData: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Social",
    			options,
    			id: create_fragment$5.name
    		});
    	}

    	get socialData() {
    		throw new Error("<Social>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set socialData(value) {
    		throw new Error("<Social>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Components/Footer/Footer.svelte generated by Svelte v3.16.7 */

    const file$6 = "src/Components/Footer/Footer.svelte";

    function create_fragment$6(ctx) {
    	let section;
    	let img;
    	let img_src_value;
    	let t0;
    	let div5;
    	let div4;
    	let div1;
    	let div0;
    	let t1;
    	let t2;
    	let p0;
    	let t4;
    	let div2;
    	let p1;
    	let t6;
    	let p2;
    	let i0;
    	let t7;
    	let t8;
    	let t9;
    	let p3;
    	let i1;
    	let t10;
    	let t11;
    	let t12;
    	let p4;
    	let i2;
    	let t13;
    	let t14;
    	let t15;
    	let div3;
    	let p5;
    	let t17;
    	let input;
    	let t18;
    	let button;

    	const block = {
    		c: function create() {
    			section = element("section");
    			img = element("img");
    			t0 = space();
    			div5 = element("div");
    			div4 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			t1 = text(/*header*/ ctx[0]);
    			t2 = space();
    			p0 = element("p");
    			p0.textContent = `${/*DESCRIPTION*/ ctx[1]}`;
    			t4 = space();
    			div2 = element("div");
    			p1 = element("p");
    			p1.textContent = `${/*HEADING*/ ctx[4]}`;
    			t6 = space();
    			p2 = element("p");
    			i0 = element("i");
    			t7 = space();
    			t8 = text(/*ADDRESS*/ ctx[5]);
    			t9 = space();
    			p3 = element("p");
    			i1 = element("i");
    			t10 = space();
    			t11 = text(/*MOBILE*/ ctx[6]);
    			t12 = space();
    			p4 = element("p");
    			i2 = element("i");
    			t13 = space();
    			t14 = text(/*EMAIL*/ ctx[7]);
    			t15 = space();
    			div3 = element("div");
    			p5 = element("p");
    			p5.textContent = `${/*SUBSCRIBE_NEWSLETTER*/ ctx[2]}`;
    			t17 = space();
    			input = element("input");
    			t18 = space();
    			button = element("button");
    			button.textContent = `${/*SUBSCRIBE*/ ctx[3]}`;
    			if (img.src !== (img_src_value = "images/wave2.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			attr_dev(img, "class", "wave-img svelte-9trpfq");
    			add_location(img, file$6, 16, 2, 445);
    			attr_dev(div0, "class", "company_brand");
    			add_location(div0, file$6, 20, 8, 609);
    			add_location(p0, file$6, 21, 8, 659);
    			attr_dev(div1, "class", "col-md-4 footer-box");
    			add_location(div1, file$6, 19, 6, 567);
    			attr_dev(p1, "class", "footer-title svelte-9trpfq");
    			add_location(p1, file$6, 24, 8, 741);
    			attr_dev(i0, "class", "fas fa-map-marker-alt");
    			add_location(i0, file$6, 26, 10, 801);
    			add_location(p2, file$6, 25, 8, 787);
    			attr_dev(i1, "class", "fas fa-phone");
    			add_location(i1, file$6, 30, 10, 892);
    			add_location(p3, file$6, 29, 8, 878);
    			attr_dev(i2, "class", "fas fa-envelope");
    			add_location(i2, file$6, 34, 10, 973);
    			add_location(p4, file$6, 33, 8, 959);
    			attr_dev(div2, "class", "col-md-4 footer-box");
    			add_location(div2, file$6, 23, 6, 699);
    			attr_dev(p5, "class", "footer-title svelte-9trpfq");
    			add_location(p5, file$6, 39, 8, 1095);
    			attr_dev(input, "type", "email");
    			attr_dev(input, "class", "form-control round-border svelte-9trpfq");
    			attr_dev(input, "placeholder", "Your Email");
    			add_location(input, file$6, 40, 8, 1154);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-outline-light round-border svelte-9trpfq");
    			add_location(button, file$6, 44, 8, 1274);
    			attr_dev(div3, "class", "col-md-4 footer-box svelte-9trpfq");
    			add_location(div3, file$6, 38, 6, 1053);
    			attr_dev(div4, "class", "row section-body");
    			add_location(div4, file$6, 18, 4, 530);
    			attr_dev(div5, "class", "container");
    			add_location(div5, file$6, 17, 2, 502);
    			attr_dev(section, "class", "main-bgcolor light-color");
    			attr_dev(section, "id", "footer");
    			add_location(section, file$6, 15, 0, 388);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, img);
    			append_dev(section, t0);
    			append_dev(section, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div1);
    			append_dev(div1, div0);
    			append_dev(div0, t1);
    			append_dev(div1, t2);
    			append_dev(div1, p0);
    			append_dev(div4, t4);
    			append_dev(div4, div2);
    			append_dev(div2, p1);
    			append_dev(div2, t6);
    			append_dev(div2, p2);
    			append_dev(p2, i0);
    			append_dev(p2, t7);
    			append_dev(p2, t8);
    			append_dev(div2, t9);
    			append_dev(div2, p3);
    			append_dev(p3, i1);
    			append_dev(p3, t10);
    			append_dev(p3, t11);
    			append_dev(div2, t12);
    			append_dev(div2, p4);
    			append_dev(p4, i2);
    			append_dev(p4, t13);
    			append_dev(p4, t14);
    			append_dev(div4, t15);
    			append_dev(div4, div3);
    			append_dev(div3, p5);
    			append_dev(div3, t17);
    			append_dev(div3, input);
    			append_dev(div3, t18);
    			append_dev(div3, button);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*header*/ 1) set_data_dev(t1, /*header*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { footerData = {} } = $$props;
    	let { header = "" } = $$props;
    	const { DESCRIPTION, CONTACT_DETAILS, SUBSCRIBE_NEWSLETTER, SUBSCRIBE } = footerData;
    	const { HEADING, ADDRESS, MOBILE, EMAIL } = CONTACT_DETAILS;
    	const writable_props = ["footerData", "header"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Footer> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("footerData" in $$props) $$invalidate(8, footerData = $$props.footerData);
    		if ("header" in $$props) $$invalidate(0, header = $$props.header);
    	};

    	$$self.$capture_state = () => {
    		return { footerData, header };
    	};

    	$$self.$inject_state = $$props => {
    		if ("footerData" in $$props) $$invalidate(8, footerData = $$props.footerData);
    		if ("header" in $$props) $$invalidate(0, header = $$props.header);
    	};

    	return [
    		header,
    		DESCRIPTION,
    		SUBSCRIBE_NEWSLETTER,
    		SUBSCRIBE,
    		HEADING,
    		ADDRESS,
    		MOBILE,
    		EMAIL,
    		footerData
    	];
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { footerData: 8, header: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Footer",
    			options,
    			id: create_fragment$6.name
    		});
    	}

    	get footerData() {
    		throw new Error("<Footer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set footerData(value) {
    		throw new Error("<Footer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get header() {
    		throw new Error("<Footer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set header(value) {
    		throw new Error("<Footer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const HEADER = "Nixalar";

    const NAVBAR_DATA = [
      { id: 1, url: "/", label: "Home" },
      { id: 2, url: "#services", label: "Services" },
      { id: 3, url: "#about-us", label: "About us" },
      { id: 4, url: "#testimonials", label: "Testimonials" },
      { id: 5, url: "#footer", label: "Contacts" }
    ];
    const BANNER_DATA = {
      HEADING: "Go digital with nixalar",
      DECRIPTION:
        "Nixalar can help you skyrocket the ROI of your marketing campaign without having to spend tons of money or time to assemble an in-house team.",
      TUTORIAL_URL:
        "https://www.thinkwithgoogle.com/intl/en-gb/marketing-resources/programmatic/google-digital-academy/",
      WATCH_TUTORIAL: "Watch Tutorials"
    };
    const SERVICE_DATA = {
      HEADING: "Our Services",
      ALL_SERVICES: "All Services",
      SERVICE_LIST: [
        {
          LABEL: "Search Engine Optimisation",
          DESCRIPTION:
            "To customise the content, technical functionality and scope of your website so that your pages show for a specific set of keyword at the top of a search engine list. In the end, the goal is to attract traffic to your website when they are searching for goods, services or business-related information.",
          URL: "images/service1.png"
        },
        {
          LABEL: "Content Marketing Strategy",
          DESCRIPTION:
            "It is tough but well worth the effort to create clever material that is not promotional in nature, but rather educates and inspires. It lets them see you as a reliable source of information by delivering content that is meaningful to your audience.",
          URL: "images/service2.png"
        },
        {
          LABEL: "Develop Social Media Strategy",
          DESCRIPTION:
            "Many People rely on social networks to discover, research, and educate themselves about a brand before engaging with that organization. The more your audience wants to engage with your content, the more likely it is that they will want to share it.",
          URL: "images/service3.png"
        }
      ]
    };

    const ABOUT_DATA = {
      HEADING: "Why choose us?",
      TITLE: "Why we're different",
      IMAGE_URL: "images/network.png",
      WHY_CHOOSE_US_LIST: [
        "We provides Cost-Effective Digital Marketing than Others.",
        "High customer statisfaction and experience.",
        "Marketing efficiency and quick time to value.",
        "Clear & transparent fee structure.",
        "We provides Marketing automation which is an integral platform that ties all of your digital marketing together.",
        "A strong desire to establish long lasting business partnerships.",
        "Provide digital marketing to mobile consumer.",
        "We provides wide range to services in reasonable prices"
      ]
    };
    const TESTIMONIAL_DATA = {
      HEADING: "What clients say?",
      TESTIMONIAL_LIST: [
        {
          DESCRIPTION:
            "Nixalar has made a huge difference to our business with his good work and knowledge of SEO and business to business marketing techniques. Our search engine rankings are better than ever and we are getting more people contacting us thanks to Jomer’s knowledge and hard work.",
          IMAGE_URL: "images/user1.jpg",
          NAME: "Julia hawkins",
          DESIGNATION: "Co-founder at ABC"
        },
        {
          DESCRIPTION:
            "Nixalar and his team have provided us with a comprehensive, fast and well planned digital marketing strategy that has yielded great results in terms of content, SEO, Social Media. His team are a pleasure to work with, as well as being fast to respond and adapt to the needs of your brand.",
          IMAGE_URL: "images/user2.jpg",
          NAME: "John Smith",
          DESIGNATION: "Co-founder at xyz"
        }
      ]
    };

    const SOCIAL_DATA = {
      HEADING: "Find us on social media",
      IMAGES_LIST: [
        "images/facebook-icon.png",
        "images/instagram-icon.png",
        "images/whatsapp-icon.png",
        "images/twitter-icon.png",
        "images/linkedin-icon.png",
        "images/snapchat-icon.png"
      ]
    };

    const FOOTER_DATA = {
      DESCRIPTION:
        "We are typically focused on result-based maketing in the digital world. Also, we evaluate your brand’s needs and develop a powerful strategy that maximizes profits.",
      CONTACT_DETAILS: {
        HEADING: "Contact us",
        ADDRESS: "La trobe street docklands, Melbourne",
        MOBILE: "+1 61234567890",
        EMAIL: "nixalar@gmail.com"
      },
      SUBSCRIBE_NEWSLETTER: "Subscribe newsletter",
      SUBSCRIBE: "Subscribe"
    };

    const MOCK_DATA = {
      HEADER,
      NAVBAR_DATA,
      BANNER_DATA,
      SERVICE_DATA,
      ABOUT_DATA,
      TESTIMONIAL_DATA,
      SOCIAL_DATA,
      FOOTER_DATA
    };

    /* src/App.svelte generated by Svelte v3.16.7 */

    function create_fragment$7(ctx) {
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let current;

    	const navbar = new Navbar({
    			props: {
    				navlists: MOCK_DATA.NAVBAR_DATA,
    				header: MOCK_DATA.HEADER
    			},
    			$$inline: true
    		});

    	const banner = new Banner({
    			props: { bannerData: MOCK_DATA.BANNER_DATA, "}": true },
    			$$inline: true
    		});

    	const services = new Services({
    			props: { serviceData: MOCK_DATA.SERVICE_DATA },
    			$$inline: true
    		});

    	const about = new About({
    			props: { aboutData: MOCK_DATA.ABOUT_DATA },
    			$$inline: true
    		});

    	const testimonials = new Testimonials({
    			props: { testimonialData: MOCK_DATA.TESTIMONIAL_DATA },
    			$$inline: true
    		});

    	const social = new Social({
    			props: { socialData: MOCK_DATA.SOCIAL_DATA },
    			$$inline: true
    		});

    	const footer = new Footer({
    			props: {
    				footerData: MOCK_DATA.FOOTER_DATA,
    				header: MOCK_DATA.HEADER
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(navbar.$$.fragment);
    			t0 = space();
    			create_component(banner.$$.fragment);
    			t1 = space();
    			create_component(services.$$.fragment);
    			t2 = space();
    			create_component(about.$$.fragment);
    			t3 = space();
    			create_component(testimonials.$$.fragment);
    			t4 = space();
    			create_component(social.$$.fragment);
    			t5 = space();
    			create_component(footer.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(navbar, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(banner, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(services, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(about, target, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(testimonials, target, anchor);
    			insert_dev(target, t4, anchor);
    			mount_component(social, target, anchor);
    			insert_dev(target, t5, anchor);
    			mount_component(footer, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbar.$$.fragment, local);
    			transition_in(banner.$$.fragment, local);
    			transition_in(services.$$.fragment, local);
    			transition_in(about.$$.fragment, local);
    			transition_in(testimonials.$$.fragment, local);
    			transition_in(social.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navbar.$$.fragment, local);
    			transition_out(banner.$$.fragment, local);
    			transition_out(services.$$.fragment, local);
    			transition_out(about.$$.fragment, local);
    			transition_out(testimonials.$$.fragment, local);
    			transition_out(social.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(navbar, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(banner, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(services, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(about, detaching);
    			if (detaching) detach_dev(t3);
    			destroy_component(testimonials, detaching);
    			if (detaching) detach_dev(t4);
    			destroy_component(social, detaching);
    			if (detaching) detach_dev(t5);
    			destroy_component(footer, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self) {
    	console.log(MOCK_DATA);

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		
    	};

    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
