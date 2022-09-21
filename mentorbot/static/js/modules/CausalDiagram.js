/*

	A class for manipulating a causal diagram

	* requires util.js

	This class also stores node positions for easier graph rendering and additional edge information, e.g., hypotheses
*/

class CausalDiagram {
	// Causal Knowledge Model JSON Format
	// {
	//     "version": "v2", (non-specified is treated as "v1")
	//     "nodes": [
	//         {
	//             "id": integer, (unique within this model)
	//             "x": float,
	//             "y": float,
	//             "name": string,
	//             "info": {
	//                 additional customized information
	//             },
	//	       },
	//         ...
	//     ],
	//     "edges": [
	//         {
	//             "id_from": integer,
	//             "id_to": integer,
	//             "info": {
	//                 "own": { (their own knowledge)
	//                     "narrative": string,
	//                     "magnitude": integer,
	//                 }
	//                 "crowd": {
	//                     "peer_count": integer,
	//                     "peer_magnitude_total": integer,
	//                     "peer_magnitude_avg": float,
	//                     "peer_total": integer,
	//                     "peer_info": [ (peers' knowledge)
	//                         {
	//                             "username": string,
	//                             "narrative": string,
	//                             "magnitude": integer,
	//                         },
	//                         ...
	//                     ]
	//                 }
	//             }
	//	       },
	//         ...
	//     ]
	// }


	constructor() {
		// This is a JSON format object
		this.causal_diagram = {
			'version': 'v2',
			'nodes': [], // each node is in the form of {'name': string, 'id': integer, 'x': number, 'y': number}
			'edges': [], // each edge is in the form of {'id_from': integer, 'id_to': integer, 'hypothesis': string}
		};
	}

	// basic operations
	// return the node if found or return undefined if not found
	find_node(id) {
		return this.causal_diagram.nodes.find(n => n.id == id);
	}

	// return the edge if it exists; otherwise, return undefined
	find_edge(id_from, id_to) {
		return this.causal_diagram.edges.find(e => e.id_from === id_from && e.id_to === id_to);
	}


	// return the parent ids in an array. If the node is not in the graph, an empty array is returned
	get_parent_ids(id) {
		return this.causal_diagram.edges.filter(e => e.id_to == id).map(e => e.id_from);
	}

	// return the parent ids in an array. If the node is not in the graph, an empty array is returned
	get_children_ids(id) {
		return this.causal_diagram.edges.filter(e => e.id_from == id).map(e => e.id_to);
	}

	// return the ancestor ids in an array. If the node is not in the graph, an empty array is returned
	get_ancestor_ids(id) {
		let ancestors = [];  // store ancestors
		let traced = [];     // to avoid infinite loop. Theoretically, if there is no loop in the diagram, this is not needed.
		let queue = [id];    // starts from this variable
		while (queue.length) {
			let id = queue.pop();
			let parents = this.get_parent_ids(id);
			parents.forEach(function(current_id) {
				// add ancestor
				if (!ancestors.includes(current_id)) {
					ancestors.push(current_id);
				}
				// push it into the queue if not traced and not in the queue
				if (!traced.includes(current_id) && !queue.includes(current_id)) {
					queue.push(current_id);
				}
				// push it into the traced array
				traced.push(current_id);
			})
		}
		return ancestors;
	}

	// return the descendant ids in an array. If the node is not in the graph, an empty array is returned
	get_descendant_ids(id) {
		let descendants = [];  // store descendants
		let traced = [];       // to avoid infinite loop. Theoretically, if there is no loop in the diagram, this is not needed.
		let queue = [id];      // starts from this variable
		while (queue.length) {
			let id = queue.pop();
			let children = this.get_children_ids(id);
			children.forEach(function(current_id) {
				// add ancestor
				if (!descendants.includes(current_id)) {
					descendants.push(current_id);
				}
				// push it into the queue if not traced and not in the queue
				if (!traced.includes(current_id) && !queue.includes(current_id)) {
					queue.push(current_id);
				}
				// push it into the traced array
				traced.push(current_id);
			})
		}
		return descendants;
	}


	// directly replace the causal diagram with the new one
	// the util function makes sure the object is replaced in place while not interfering with the new causal diagram
	set_causal_diagam(causal_diagram) {
		util.replaceJSONInPlace(this.causal_diagram, causal_diagram);
		let x=1;
		let y=2;
	}

	// use this function to alter this.causal_diagram for better code maintenance
	// Input:
	//		(string) action: 'set' or 'delete'
	//		(string) type: 'node' or 'edge'
	//		(dict) parameters: different parameters based on 'action' and 'type'
	update_diagram(action, type, parameters) {
		let is_creating = false;
		if (action === 'set') {
			if (type === 'node') {
				// parameters = {
				// 		vid: int,
				// 		name: string,
				// 		x: number,
				// 		y: number,
				// }
				let node = this.causal_diagram.nodes.find(n => n.id == parameters.vid);
				if (node === undefined) {
					// new node
					this.causal_diagram.nodes.push({
						'name': parameters.name,
						'id': parameters.vid,
						'x': parameters.x,
						'y': parameters.y,
					});
					is_creating = true;
				}
				else {
					// update node
					// note: to preserve references, don't create another dict
					node.x = parameters.x;
					node.y = parameters.y;
					node.name = parameters.name;
				}
			}
			else if (type === 'edge') {
				// parameters = {
				// 		vid_from: int,
				// 		vid_to: int,
				//      info: {},
				// 		hypothesis: string, // deprecated
				//      magnitude: integer, // deprecated
				// }
				let edge = this.causal_diagram.edges.find(
					e => e.id_from == parameters.vid_from && e.id_to == parameters.vid_to
				);
				if (edge === undefined) {
					// new edge
					this.causal_diagram.edges.push({
						'id_from': parameters.vid_from,
						'id_to': parameters.vid_to,
						'info': JSON.parse(JSON.stringify(parameters.info || {})),
						// 'hypothesis': parameters.hypothesis, // deprecated
						// 'magnitude': parameters.magnitude, // deprecated
					});
					is_creating = true;

					// TODO: update parents and children
				}
				else {
					// update hypothesis
					util.replaceJSONInPlace(edge.info, parameters.info || {}) // replace the JSON
					// edge.hypothesis = parameters.hypothesis; // deprecated
					// edge.magnitude = parameters.magnitude; // deprecated
				}
			}
		}
		else if (action === 'delete') {
			if (type === 'node') {
				// parameter = {vid: int}
				// TODO: update parents and children

				this.causal_diagram.nodes = this.causal_diagram.nodes.filter(n => n.id != parameters.vid);
				this.causal_diagram.edges = this.causal_diagram.edges.filter(e => e.id_from != parameters.vid && e.id_to != parameters.vid);
			}
			else if (type === 'edge') {
				// parameter = {vid_from: int, vid_to: int}
				// TODO: update parents and children

				this.causal_diagram.edges = this.causal_diagram.edges.filter(
					e => e.id_from != parameters.vid_from || e.id_to != parameters.vid_to
				);
			}
		}
	}
}
