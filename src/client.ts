import {parse} from "./parse";
import {Doc} from "./Doc";

if (window) {
	// @ts-ignore
	window.BFS = {
		// @ts-ignore
		...(window.BFS || {}),
		Doc,
		parse
	}
	
}
