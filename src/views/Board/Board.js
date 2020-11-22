import React, {Component} from "react";
import {Row, Col, InputNumber, Typography, Button, Menu, Layout, Switch} from 'antd';
import {
	DownloadOutlined,
} from '@ant-design/icons';
import { Graph } from "react-d3-graph";
import Tree from 'react-d3-tree';
import ReactApexChart from "react-apexcharts";
import 'antd/dist/antd.css';
import Modal from 'react-modal';
import './_Board.scss';
import { johnson } from '../../algorithms/johnson';
import { asignacion } from '../../algorithms/asignacion';
import { noroeste } from '../../algorithms/noroeste';
import { trees } from '../../algorithms/arboles';
import { compet } from '../../algorithms/compet';
import { sort } from '../../algorithms/sort';
import { getUrlParams } from "../../utils";
import { PriorityQueue } from "../../algorithms/PriorityQueue";

const { Title } = Typography;
const Matrix = React.lazy(() => import("../../components/Matrix/Matrix"));
const RawMatrix = React.lazy(() => import("../../components/RawMatrix/RawMatrix"));
const SelfLoopLabels = React.lazy(() => import("../../components/SelfLoopLabels/SelfLoopLabels"));
const TreeNode = React.lazy(() => import("../../components/TreeNode/TreeNode"));
const { Header, Content, Footer, Sider } = Layout;
const { SubMenu } = Menu;

class Board extends Component {

	constructor(props) {
		super(props);
		this.containerRef = React.createRef();
		this.getRectsInterval = null;
	}

	state = {
		inputType: "node",
		nodeRadius: 200,
		nodes: [],
		nodeMap: {},
		edges: [],
		graph: {},
		lastNodeIndex: -1,
		collapsed: false,
		nodeStyle: {
			radius: 20
		},
		startEdge: null,
		edgeWeight: 1,
		containerRect: null,
		drawingExitNodes: true,
		editMode: false,
		isConfigurationModalOpen: false
	};

	componentDidMount() {
		this.setState(prevState => {
			const containerRect = this.containerRef.current.getBoundingClientRect();
			//console.log('cont rect: ',containerRect);
			prevState.containerRect = containerRect;
			return prevState;
		});
		this.getRectsInterval = setInterval(() => {
			this.setState(prevState => {
				const containerRect = this.containerRef.current.getBoundingClientRect();
				//console.log('cont rect: ',containerRect);
				prevState.containerRect = containerRect;
				return prevState;
			});
		}, 5000);
		this.setState(prevState => {
			prevState.editMode = getUrlParams("editMode");
			prevState.nodes = JSON.parse(localStorage.getItem("nodes")) || [];
			prevState.edges = JSON.parse(localStorage.getItem("edges")) || [];
			let graph = {};
			let nodeMap = {};
			for(let  i = 0; i < prevState.nodes.length; i++) {
				graph[prevState.nodes[i].id] = [];
				nodeMap[prevState.nodes[i].id] = prevState.nodes[i];
			}
			prevState.nodeMap = nodeMap;
			for(let  i = 0; i < prevState.edges.length; i++) {
				//if(graph[prevState.edges[i].start] === undefined) graph[prevState.edges[i].start] = [];
				//if(graph[prevState.edges[i].end] === undefined) graph[prevState.edges[i].start] = [];
				graph[prevState.edges[i].start].push([prevState.edges[i].weight,prevState.edges[i].end]);
				graph[prevState.edges[i].end].push([prevState.edges[i].weight,prevState.edges[i].start]);
			}
			prevState.graph = graph;
		});
	}

	Lines = () => {
		return this.state.edges.map((edge, idx) => {
			const lineStyle = {
				stroke: "#003152",
				strokeWidth: 10
			};
			return (
				 <line key={idx} x1={edge.startX} y1={edge.startY} x2={edge.endX} y2={edge.endY} style={lineStyle} />
			)
		});
	};

	SVG = () => {

		return (
			 <svg className={"svg"}>
				 {this.Lines()}
			 </svg>
		)
	};

	getShortestPath = (initNode) => {
		let comparator = (a,b) => {
				 if (a[0] === b[0]) {
					 return a[1] > b[1];
				 } else {
					 return a[0] > b[0];
				 }
			 };
		let d = [],p = [];
		let reachedExitNodes = [];
		let inf = 9999999999;
		for(let i = 0; i < this.state.nodes.length; i++) {
			d.push(inf);
			p.push(-1);
		}
		let pq = new PriorityQueue(comparator);
		d[initNode] = 0;
		pq.push([0,initNode]);
		console.log('Size of pq: ',pq.size());
		console.log('Graph: ',this.state.graph);
		while(pq.size() !== 0) {
			let x = pq.pop();
			if(this.state.nodeMap[x[1]].exitNode)reachedExitNodes.push(x[1]);
			console.log('Poped value: ',x);
			for(let i = 0; i < this.state.graph[x[1]].length; i++) {
				let addedWeight = this.state.graph[x[1]][i][0];
				let newWeight = d[x[1]] + addedWeight;
				let destNode = this.state.graph[x[1]][i][1];
				console.log('Triying to go to: ',destNode);
				if(d[destNode] > newWeight) {
					d[destNode] = newWeight;
					p[destNode] = x[1];
					pq.push([newWeight,destNode]);
				}
			}
		}
		console.log('Dist: ',d);
		console.log('Exit nodes reached: ',reachedExitNodes);
		let res = [];
		if(reachedExitNodes.length > 0) {
			let minPos = 0;
			let mini = inf;
			for(let i = 0; i < reachedExitNodes.length; i++) {
				if(mini > d[reachedExitNodes[i]]){
					mini = d[reachedExitNodes[i]];
					minPos = i;
				}
			}
			let node = reachedExitNodes[minPos];
			while(node !== -1) {
				res.unshift(node);
				node = p[node];
			}
		}
		console.log('Path to exit: ',res);
		return res;
	};

	onClickNode = (e,node) => {
		e.stopPropagation();
		console.log('Clicked node ',node);
		if(!this.state.editMode) {
			console.log('not in edit mode');
			let path = this.getShortestPath(node.id);
		}
		if(this.state.startEdge === null) {
			this.setState(prevState => {
				prevState.startEdge = node;
				return prevState;
			})
		} else {
			let rect = e.target.getBoundingClientRect();
			this.setState(prevState => {
				let endEdge = node;
				prevState.edges.push(
					 {
						 start: prevState.startEdge.id,
						 end: endEdge.id,
						 weight: prevState.edgeWeight,
						 isOut: prevState.drawingExitNodes,
						 startX: prevState.startEdge.x - this.state.containerRect.left + this.state.nodeStyle.radius/2,
						 startY: prevState.startEdge.y - this.state.containerRect.top + this.state.nodeStyle.radius/2,
						 endX: endEdge.x - this.state.containerRect.left + this.state.nodeStyle.radius/2,
						 endY: endEdge.y - this.state.containerRect.top + this.state.nodeStyle.radius/2
					 }
				);
				prevState.startEdge = null;
				console.log("Edges: ",prevState.edges);
				return prevState;
			})
		}
	};

	Nodes = () => {
		return this.state.nodes.map((node,idx) => {
			let nodeStyle = {
				position:"absolute",
				top: node.y.toString() + "px",
				left: node.x.toString() + "px",
				width: this.state.nodeStyle.radius.toString() + "px",
				height: this.state.nodeStyle.radius.toString() + "px",
				zIndex: 10
			};
			let isExit = node.exitNode ? "exit" : "";
			return (
				 <div className={"node " + isExit} style={nodeStyle} key={idx} onClick={e => this.onClickNode(e,node)}>

				 </div>
			);
		})
	};

	createNode = (e) => {
		var rect = e.target.getBoundingClientRect();
		let x = e.clientX - this.state.nodeStyle.radius/2;
		let y = e.clientY - this.state.nodeStyle.radius/2;
		let me = this;
		me.setState((prevState) => {
			console.log("Crating new node");
			let nodeId =  (prevState.lastNodeIndex+1);
			prevState.lastNodeIndex = prevState.lastNodeIndex + 1;
			prevState.nodes.push(
				 {
					 id: nodeId,
					 x: x,
					 y: y,
					 exitNode: prevState.drawingExitNodes
				 }
			);
			console.log("Creating node, new array: ",prevState.nodes);
			return prevState;
		});
	};

	ConfigurationModal = () => {
		let me = this;
		const customStyles = {
			content : {
				top                   : '50%',
				left                  : '50%',
				right                 : 'auto',
				bottom                : 'auto',
				marginRight           : '-50%',
				transform             : 'translate(-50%, -50%)'
			}
		};

		function onChange(value) {
			console.log('changed', value);
			me.setState({edgeWeight: value})
		}

		function onSwitchChange(checked) {
			console.log(`switch to ${checked}`);
			me.setState({drawingExitNodes: checked})
		}

		return (
			 <Modal
				  isOpen={this.state.isConfigurationModalOpen}
				  onRequestClose={() => this.setState({isConfigurationModalOpen: false})}
				  style={customStyles}
				  contentLabel="Add Edge"
				  ariaHideApp={false}
			 >
				 <Row justify={"center"}>
					 <Col span={20}>
						 <Switch className={"switch"} checkedChildren="Sal." unCheckedChildren="Cam." checked={this.state.drawingExitNodes} onChange={onSwitchChange}/>
					 </Col>
				 </Row>
				 <br/>
				 <Row>
					 <InputNumber min={1} max={10} defaultValue={1} onChange={onChange} />
				 </Row>
				 <br />
				 <Row justify={"center"}>
					 <Button type="primary" icon={<DownloadOutlined />} size={'middle'} onClick={() => {
					 	localStorage.setItem("edges",JSON.stringify(this.state.edges));
					 	localStorage.setItem("nodes",JSON.stringify(this.state.nodes));
					 }} />
				 </Row>
			 </Modal>
		);
	};

	render() {
		//console.log("MAIN RETURN :",this.state.competData);
		return (
            <Layout style={{ minHeight: '100vh' }}>
                <Layout className="site-layout bodyCtn">
                    <Content style={{ margin: '0 16px' }}>
                        <div className={"mainCtn"}>
	                        <Row className={"map-ctn"} type="flex" justify="space-around" align="middle">
		                        <Col className={"map-sub-ctn"} span={23}>
			                        <Row justify={"center"} align={"middle"}>
				                        <div
					                         className={"map-image-ctn"} onClick={this.createNode}
					                         ref={this.containerRef}
				                        >
					                        {this.SVG()}
				                        </div>
			                        </Row>
			                        <Row justify={"center"} align={"middle"}>
				                        { this.state.editMode && (
					                            <div onClick={(e) => this.setState({isConfigurationModalOpen: true})}>
							                        Abrir Configuración
						                        </div>
				                            )
				                        }
			                        </Row>
		                        </Col>
	                        </Row>
                        </div>
	                    {this.Nodes()}
	                    {this.ConfigurationModal()}
                    </Content>
                </Layout>
            </Layout>
        );
	}
}

export default Board;
