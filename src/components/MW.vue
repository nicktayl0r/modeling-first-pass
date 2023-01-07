<template>
  <div class="ModelingWidget">
    <div class="ModelingWidget-Inventory">
      <div class="ModelingWidget-InventoryHeader">{{seed ? seed.inventory.title || "Components" : "Components"}}</div>
      <div class="ModelingWidget-InventoryBody">
        <template v-for="v in currentPage.vertices">
          <div v-if="v.type === 'group'" :key="v.title" class="ModelingWidget-InventoryVertexGroup">
            <div class="ModelingWidget-InventoryVertexGroupTitle">{{v.title}}</div>
            <div class="ModelingWidget-InventoryVertices">
              <div v-for="a in v.vertices" :draggable="!graphNodes.includes(a.title)" :key="a.title" :class="['ModelingWidget-InventoryVertex',{'ModelingWidget-InventoryVertex--disabled': graphNodes.includes(a.title)}]" @dragstart="onDragStartFromInventory($event, a)" @dragend="handleCanvasDragEnds($event, a)">
                <img draggable="false" class="ModelingWidget-InventoryVertexImage" />
                <div class="ModelingWidget-InventoryVertexTitle">{{a.title}}</div>
              </div>
            </div>
          </div>
          <div v-else :draggable="!graphNodes.includes(v.title)" :key="v.title + 'else'" :class="['ModelingWidget-InventoryVertex',{'ModelingWidget-InventoryVertex--disabled': graphNodes.includes(v.title)}]" @dragstart="onDragStartFromInventory($event, v)" @dragend="handleCanvasDragEnds($event, v)">
              <img draggable="false" class="ModelingWidget-InventoryVertexImage" />
              <div class="ModelingWidget-InventoryVertexTitle">{{v.title}}</div>
          </div>
        </template>
      </div>
      <div v-if="(pages.length>1)" class="ModelingWidget-InventoryPageControls">
        <button  class="ModelingWidget-InventoryPageBackButton" @click="onPreviousInventoryPage()"></button>
        <div class="ModelingWidget-InventoryPageIndicator">
          {{(currentPageIndex + 1)}} {{" / "+ pages.length}}
        </div>
        <button  class="ModelingWidget-InventoryPageForwardButton" @click="onNextInventoryPage()"></button>
      </div>
    </div>
    <div class="ModelingWidget-Controls">
      <button  class="ModelingWidget-ClearRelationships" @click="onClear">Start Over</button>
      <button  class="ModelingWidget-BuildRelationship" @click="onBuildRelationship">Build Relationship</button>
      <button  class="ModelingWidget-Positive" @click="onPositive">Positive</button>
      <button class="ModelingWidget-Negative" @click="onNegative">Negative</button>
    </div>
    <div class="ModelingWidget-CanvasContainer" id="modeling-svg" @dragover="onCanvasHover($event)">
    </div>
  </div>
</template>

<script lang="ts">
//@ts-ignore
import * as d3 from "d3";
import { Component, Prop, Vue } from "vue-property-decorator";
import { Seed, Vertex, Graph } from "./ModelingWidgetTypes";


interface InventoryPage {
  vertices: any[]
}

@Component
export default class ModelingWidget extends Vue {
  seed: Seed | null = null;
  currentPageIndex: number = 0;
  d3: any;
  isDraggingFromInventory: boolean = false;

  // data for PIs

  inventoryEnabled = true;
  relationshipEditingEnabled = false;
  relationShipEditingActive = true;

  graphNodes: string[] = [];
  graphRecord: Graph = {};
  solutionRecord: any = []

  userPlacedVertex: boolean = false;
  userPlacedEdge: boolean = false
  stagedEdge: [string, string] | null = null;
  inventoryOn = true;
  toolbarOn = true;
  modelConfig = {
  "inventory": {
    "availableVertices":
    [
      { "type": "single", "title": "Number of Pets", "imgPath": "", "pageIndex": 0},
      { "type": "single", "title": "Number of Dust Mites", "imgPath": "", "pageIndex": 0},
      { "type": "single", "title": "Number of Cats", "imgPath": "", "pageIndex": 0},
      { "type": "single", "title": "Number of Birds", "imgPath": "", "pageIndex": 0},
      { "type": "single", "title": "Number of Crabs", "imgPath": "", "pageIndex": 1},
      { "type": "single", "title": "Number of Tanyas", "imgPath": "", "pageIndex": 1},
      { "title": "Other Things",
        "type": "group",
        "pageIndex": 1,
        "vertices": [
          {"type": "single", "title": "Number of Phallanges",  "imgPath": ""},
          {"type": "single", "title": "Amount of Microplastics", "imgPath": ""}
        ]},
      { "type": "single", "title": "Number of Inhaler Uses", "imgPath": "", "pageIndex": 0}
    ]
  },
  "subgraphs": {
    "correctSubGraph": {},
    "partialCreditSubgraphs": []
  }
};
  currentSnapshot = ""


  get pages(): InventoryPage[] {
    let pageScore = 0;
    let outPages: InventoryPage[] = [];
    let currPage: InventoryPage = { vertices: []};
    const availableVertices = this.seed ? this.seed.inventory.availableVertices : [];
    for( const v of availableVertices) {
      if(v.pageIndex !== undefined && outPages[v.pageIndex]) {
        outPages[v.pageIndex].vertices.push(v)
      }

      if(v.pageIndex !== undefined && !outPages[v.pageIndex]) {
        outPages[v.pageIndex] = {vertices: [v]};
      }
    }

    if(currPage.vertices.length) {
      outPages.push(JSON.parse(JSON.stringify(currPage)));
      currPage = { vertices: [] };
      pageScore = 0;

    }

    return outPages;
  }

  get currentPage() {
    const i = this.currentPageIndex
    return this.pages[i] || {"vertices": []};
  }

  // get widgetNodePrompt() {
  //   const out = readWidgetEntryVal(this.$store)(
  //     this.pageID,
	//     this.$props.id,
	//     "showNodePrompt")

  //   return out || "";
  // }

  // @Watch("widgetNodePrompt")
  // onNewNodePrompt(newVal: any, oldVal: any) {
  //   const setStagedSolution = this.setStagedSolution;
  //   if(newVal.value !== "") {
  //     const textNode = d3.selectAll("text")
  //     .filter(function(m) {
  //       return d3.select(this).text() === newVal.value;
  //     })

  //     // create a dialog with two buttons
  //     const coords = this.graphRecord[newVal.value].coordinates
  //     const solutionModal = this.d3
  //       .append("g")
  //       .attr("transform", `translate(${coords[0] + 50},${coords[1] + 40})`)

  //     const increase = function() {
  //       setStagedSolution(newVal.value, "increase")
        
  //     }
  //     const decrease = function() {
  //       setStagedSolution(newVal.value, "decrease")
  //     }

  //     const increaseButton = solutionModal.append("rect")
  //       .attr("width", 15)
  //       .attr("height", 15)
  //       .attr("class", "solution-button")
  //       .attr('x', -40)
  //       .attr('y', -20)
  //       .attr("rx", 4)
  //       .style("fill", "white")
  //       .style("stroke", "green")
  //       .on("click", increase);

  //     solutionModal
  //     .append("text")
  //     .attr("width", 15)
  //     .attr("height", 15)
  //     .attr("x", -40)
  //     .attr("y", -20)
  //     .attr("dy", 0)
  //     .attr("dx", 0)
  //     .text("^")

  //     const decreaseButton = solutionModal.append("rect")
  //     .attr("width", 15)
  //     .attr("height", 15)
  //     .attr("class", "solution-button")
  //     .attr('x', -40)
  //     .attr('y', -40)
  //     .attr("rx", 4)
  //     .style("fill", "white")
  //     .style("stroke", "red")
  //     .on("click", decrease)

  //     solutionModal
  //     .append("text")
  //     .attr("width", 15)
  //     .attr("height", 15)
  //     .attr("x", -40)
  //     .attr("y", -40)
  //     .attr("dy", 20)
  //     .attr("dx", 0)
  //     .text("v")
  //     .raise();

  //     solutionModal
  //     .append("text")
  //     .attr("width", 15)
  //     .attr("height", 15)
  //     .attr("x", -40)
  //     .attr("y", -20)
  //     .attr("dy", 0)
  //     .attr("dx", 0)
  //     .text("^")
  //     .raise()


  //     // based on button click, assign classes, update graphRecord
  //   } else {
  //     this.solutionRecord.push(this.stagedSolutionRecord);
  //     d3.selectAll(".solution-button").remove();
  //     this.stagedSolutionRecord = [];
  //   }
  // }

  vertexSearch(v: Vertex, g: Graph, s: Graph, visited: any): boolean {
    const subGraphVertex = s[v.id];
    if (!visited[v.id]) {
      visited[v.id] = { positive: [], negative: [] }
    }
    let out = true;

    for (const p of subGraphVertex.positiveNeighbors) {
      if (!v.positiveNeighbors.includes(p)) {
        out = false
      }
    }

    if (out) {
      for (const n of subGraphVertex.positiveNeighbors) {
        if (!v.positiveNeighbors.includes(n)) {
          out = false;
        }
      }
    }

    if (out) {
      // if the graph vertex contains all the neighbors of the subgraph vertex, we can now apply
      // the above logic to the subgraphs neighbors.
      for (const nKey of subGraphVertex.positiveNeighbors) {
        if (!visited[v.id].positive.includes(nKey)) {
          visited[v.id].positive.push(nKey)
          out = this.vertexSearch(g[nKey], g, s, visited)
        }
      }

      for (const nKey of subGraphVertex.positiveNeighbors) {
        if (!visited[v.id].negative.includes(nKey)) {
          visited[v.id].negative.push(nKey)
          out = this.vertexSearch(g[nKey], g, s, visited)
        }
      }
    }

    return out;
  }

  subGraphMatch(g: Graph, s: Graph): boolean {
    let out = false;
    const visited = {}

    for (const key of Object.keys(s)) {
      const potentialVertex = g[key];
      
      if (potentialVertex) {
        out = this.vertexSearch(potentialVertex, g, s, visited)
      }
    }

    return out
  }

  onClear() {
    this.d3.selectAll('*').remove();
    this.setDefs();
    this.graphNodes = [];
    this.graphRecord = {};
  }

  onPositive() {
    // if(this.relationshipEditingEnabled) { 
    //   runWidgetEventConditions(this, this.onEdgeTypeSelect, this.$props.id);
    // }
    if(this.stagedEdge && this.stagedEdge.length) {
      const stagedEdge = this.stagedEdge
      this.graphRecord[stagedEdge[0]].neutralNeighbors = this.graphRecord[stagedEdge[0]].neutralNeighbors.filter((v) => v !== stagedEdge[1])

      this.graphRecord[stagedEdge[0]].positiveNeighbors = this.graphRecord[stagedEdge[0]].positiveNeighbors.filter((v) => v !== stagedEdge[1])

      this.graphRecord[stagedEdge[0]].negativeNeighbors = this.graphRecord[stagedEdge[0]].negativeNeighbors.filter((v) => v !== stagedEdge[1])

      this.graphRecord[stagedEdge[0]].positiveNeighbors.push(stagedEdge[1])
    }
    this.d3.selectAll('*').remove();
    this.setDefs();
    this.drawGraph();
  }

  onNegative() {
    // if(this.relationshipEditingEnabled) {
    //   runWidgetEventConditions(this, this.onEdgeTypeSelect, this.$props.id);
    // }
    if(this.stagedEdge && this.stagedEdge.length) {
      const stagedEdge = this.stagedEdge
      this.graphRecord[stagedEdge[0]].neutralNeighbors = this.graphRecord[stagedEdge[0]].neutralNeighbors.filter((v) => v !== stagedEdge[1])

      this.graphRecord[stagedEdge[0]].positiveNeighbors = this.graphRecord[stagedEdge[0]].positiveNeighbors.filter((v) => v !== stagedEdge[1])

      this.graphRecord[stagedEdge[0]].negativeNeighbors = this.graphRecord[stagedEdge[0]].negativeNeighbors.filter((v) => v !== stagedEdge[1])

      this.graphRecord[stagedEdge[0]].negativeNeighbors.push(stagedEdge[1])
    }
    this.d3.selectAll('*').remove();
    this.setDefs();
    this.drawGraph();
  }

  onBuildRelationship() {
    this.relationshipEditingEnabled = true;
    this.drawEdgeHooks();
  }

  onNextInventoryPage () {
    if(this.currentPageIndex < this.pages.length-1 && this.inventoryEnabled) {
      this.currentPageIndex = this.currentPageIndex + 1;
      // this.$forceUpdate();

    }
  }

  onPreviousInventoryPage () {
    if(this.currentPageIndex > 0 && this.inventoryEnabled) {
      this.currentPageIndex = this.currentPageIndex - 1;
      // this.$forceUpdate();
    }
  }
  // Canvas methods
  onDragStartFromInventory (e: any, v: any) {
    
    this.isDraggingFromInventory = true;
  }

  onCanvasHover(e: any) {
    if(this.isDraggingFromInventory) {
      // 
      const a = 0
      return a
      // render the dragged element
    }
    return 1;
  }

  hookDrag(d: any, i: any, v: any) {
    const drawEdges = this.drawEdges
    const updateGraphRecord = this.updateGraphRecord
    const getGraphRecord = this.getGraphRecord;
    const drawEdgeKnob = this.drawEdgeKnob;
    let startingNode: string
    const svg = this.d3;
    let initialHookLocation: number[] = []

    const gr = getGraphRecord();

    var hook = document.elementFromPoint(d.clientX, d.clientY);
    
    if(hook && hook.parentNode && hook.parentNode.children[1]) {
      startingNode = hook.parentNode.children[1].textContent || ""
    }
    initialHookLocation = [d.clientX, d.clientY]

    const line = svg.append("line")
        .attr("class", "staged-line")
        .attr("stroke", "steelblue")
        .attr("stroke-width", "2px")
        .attr("stroke-linecap", "round")
        .attr('marker-end', 'url(#arrow-neutral)')
        .attr("x1", d.clientX-250)
        .attr("y1", d.clientY-250)
        .attr("x2", d.clientX-250)
        .attr("y2", d.clientY-250);
      
    function mousemove(a: any) {
      const coords = gr[startingNode].coordinates
      
      const line = svg.select(".staged-line");

      line
      .attr("x2",a.clientX-250)
      .attr("y2", a.clientY-250)
    }


    function mouseup(a: any) {
      var rect = document.elementFromPoint(a.clientX, a.clientY);
      let text: any;

      console.log("@mouseup", rect, getGraphRecord)
      
      // from this rectangle, derive the corresponding title
      if(rect && rect.parentNode && rect.parentNode.children[1]) {
        text = rect.parentNode.children[1];
        const graphRecord = getGraphRecord(); //@ts-ignore
        const newNeutrals = [...graphRecord[startingNode]['neutralNeighbors'], text.textContent];
        
        updateGraphRecord(startingNode, "neutralNeighbors", newNeutrals);
        
      } else if (startingNode) {
        svg.selectAll(".staged-line").remove()
      }
      console.log("@mouseup", rect, getGraphRecord())
      const originVertex = getGraphRecord()[startingNode].coordinates
      const destinationVertex = getGraphRecord()[text.textContent].coordinates

      var x = (destinationVertex[0] + originVertex[0]) / 2;
      var y = (destinationVertex[1] + originVertex[1]) / 2;

      
      drawEdgeKnob(x, y, startingNode, text.textContent)
      svg.on("mousemove", null);
    }
          
    svg.on("mousemove", mousemove);
    svg.on("mouseup", mouseup)
    d.stopPropagation();
  }

  drawEdgeHooks() {
    const v = this.d3.selectAll(".d3-vertex");
    const amt = 65
    const centerAmt = 35;
    const hookDrag = this.hookDrag

    v.append("circle")
    .attr("r", 10)
    .attr("cx", centerAmt)
    .attr("cy", centerAmt-amt)
    .attr("class", "north-hook")
    .attr("fill", "#039BE5")
    .attr("stroke", "#039BE5")
    .on("mousedown", (d: any, i: any, _v: any) => hookDrag(d, i, v))
    .raise()
    

    v.append("circle")
    .attr("r", 10)
    .attr("cx", centerAmt)
    .attr("cy", centerAmt + amt)
    .attr("class", "south-hook")
    .attr("fill", "#039BE5")
    .attr("stroke", "#039BE5")
    .on("mousedown", (d: any, i: any, _v: any) => hookDrag(d, i, v))
    .raise()

    v.append("circle")
    .attr("r", 10)
    .attr("cx", centerAmt + amt)
    .attr("cy", centerAmt)
    .attr("class", "east-hook")
    .attr("fill", "#039BE5")
    .attr("stroke", "#039BE5")
    .on("mousedown", (d: any, i: any, _v: any) => hookDrag(d, i, v))
    .raise()

    v.append("circle")
    .attr("r", 10)
    .attr("cx", centerAmt - amt)
    .attr("cy", centerAmt)
    .attr("class", "west-hook")
    .attr("fill", "#039BE5")
    .attr("stroke", "#039BE5")
    .on("mousedown", (d: any, i: any, _v: any) => hookDrag(d, i, v))
    .raise()
  }

  updateGraphRecord(vertex: string, field: string, newVal: any) { //@ts-ignore
    this.graphRecord[vertex][field] = newVal;

    // if (this.$props.sharedDataWriteKey) {
		// 	this.updateSharedDataVal(this.$props.sharedDataWriteKey, JSON.stringify(this.graphRecord));
    // }
    
  }

  getGraphRecord () {
    return this.graphRecord
  }
  
  drawVertexToSVG(title: string, x: number, y: number) {
    const {
      getGraphRecord,
      updateGraphRecord,
      removeVertex,
      drawEdgeKnob,
      drawEdges
    } = this;
    const svg = this.d3;
    function dragstarted(event: any, d: any) {
      //@ts-ignore
      d3.select(this).raise().attr("stroke", "black");
    }


    function dragged(event: any, d: any) { //@ts-ignore
      d3.select(this).attr("transform", `translate(${event.x},${event.y})`)
      updateGraphRecord(title, "coordinates", [event.x, event.y])
      d3.selectAll('line').remove();
      d3.selectAll(".edge-knob").remove()

      const gr = getGraphRecord();
      
      for(const key of Object.keys(gr)) {
        for(const vert of gr[key].neutralNeighbors) {
          
          const from = gr[key].coordinates;
          const to = gr[vert].coordinates;

          var x = (to[0] + from[0]) / 2;
          var y = (to[1] + from[1]) / 2;

          const toModified: [number, number] = [to[0]-500, to[1]+5]
          console.log([event.clientX, event.clientY], {toModified, d})

          let promise = new Promise(function(resolve, reject) {
            drawEdges(from, to, "neutral", "initial-line")
          });
        }
        for(const vert of gr[key].positiveNeighbors) {
          
          const from = gr[key].coordinates;
          const to = gr[vert].coordinates;

          var x = (to[0] + from[0]) / 2;
          var y = (to[1] + from[1]) / 2;

          const toModified: [number, number] = [to[0]-500, to[1]+5]
          console.log([event.clientX, event.clientY], {toModified, d})

          let promise = new Promise(function(resolve, reject) {
            drawEdges(from, to, "positive", "")
          });
        }
        for(const vert of gr[key].negativeNeighbors) {
          
          const from = gr[key].coordinates;
          const to = gr[vert].coordinates;

          var x = (to[0] + from[0]) / 2;
          var y = (to[1] + from[1]) / 2;

          const toModified: [number, number] = [to[0]-500, to[1]+5]
          console.log([event.clientX, event.clientY], {toModified, d})

          let promise = new Promise(function(resolve, reject) {
            drawEdges(from, to, "negative", "")
          });
        }
      }
    }

    function dragended(event: any, d: any) { //@ts-ignore
      d3.select(this).attr("stroke", null);
    }

    function clicked(e: any) {
      //remove any delete buttons on any other elements
      d3.select(".vertex-delete-button").remove()
      //@ts-ignore
      const killButton = d3.select(this).raise()
        .append('rect')
        .attr("class", 'vertex-delete-button')
        .attr("width", 10)
        .attr("height", 10)
        .attr('x', -20)
        .attr('y', -20)
        .attr("rx", 4)
        .style("fill", "red")
        .style("stroke", "red")
        .raise()



      killButton.on("click", () => removeVertex(title));
    }
     
    const rectGroup = this.d3
      .append("g")
      .attr("class", "d3-vertex")
      .attr("transform", `translate(${x-250},${y-50})`)
      .on("click", clicked)

    const rectangle = rectGroup
      .append("rect")
      .attr("width", 70)
      .attr("height", 70)
      .attr('x', 0)
      .attr('y', 0)
      .attr("rx", 4)
      .style("fill", "#6b767d")
      .style("stroke", "#6b767d");

    rectGroup
      .append("text")
      .attr("width", 70)
      .attr("x", 0)
      .attr("y", 0)
      .attr("dy", 90)
      .attr("dx", -25)
      .text(() => title)

    rectGroup.call(
      d3
        .drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
    )
  }

  handleCanvasDragEnds(e: any, v: any) {

    this.graphNodes.push(v.title)
    this.isDraggingFromInventory = false;   

    this.graphRecord[v.title] = {
      positiveNeighbors: [],
      negativeNeighbors: [],
      neutralNeighbors: [],
      coordinates: [e.x-250, e.y-50],
      solved: undefined,
      name: v.title,
      id: v.title,
    }
    // if(this.userPlacedVertex === false) {
    //   runWidgetEventConditions(this, this.onFirstNodeDrag, this.$props.id);
    //   this.updateWidget("userPlacedVertex", true);
    // }
    // runWidgetEventConditions(this, this.onNodePlacement, this.$props.id);

    this.drawVertexToSVG(v.title, e.x, e.y-200)
  }

  removeVertex(name: string) {
    this.graphNodes = this.graphNodes.filter(n => n !== name);

    for(const k of Object.keys(this.graphRecord)) {
      this.graphRecord[k].neutralNeighbors  = this.graphRecord[k].neutralNeighbors.filter(v => v !== name)
      this.graphRecord[k].positiveNeighbors = this.graphRecord[k].positiveNeighbors.filter(v => v !== name)
      this.graphRecord[k].negativeNeighbors = this.graphRecord[k].negativeNeighbors.filter(v => v !== name)
    }
    delete this.graphRecord[name];

    // if (this.$props.sharedDataWriteKey) {
		// 	this.updateSharedDataVal(this.$props.sharedDataWriteKey, JSON.stringify(this.graphRecord));
    // }

    this.d3.selectAll('*').remove();
    this.setDefs();
    this.drawGraph();
  }

  removeEdge(origin: string, destination: string) {
    this.graphRecord[origin].neutralNeighbors  = this.graphRecord[origin].neutralNeighbors.filter(v => v !== destination)
    this.graphRecord[origin].positiveNeighbors = this.graphRecord[origin].positiveNeighbors.filter(v => v !== destination)
    this.graphRecord[origin].negativeNeighbors = this.graphRecord[origin].negativeNeighbors.filter(v => v !== destination)

    // if (this.$props.sharedDataWriteKey) {
		// 	this.updateSharedDataVal(this.$props.sharedDataWriteKey, JSON.stringify(this.graphRecord));
    // }
    this.d3.selectAll('*').remove();
    this.setDefs();
    this.drawGraph();
  }

  setStagedEdge(origin: string, destination: string) {
    this.stagedEdge = [origin, destination];
  }

  drawEdgeKnob(x: number, y: number, originVertex: string, destinationVertex: string) {
    const radius = 10;
    const svg = this.d3;
    const edgeKnob = this.d3.append("circle");
    const removeEdge = this.removeEdge;
    const setStagedEdge = this.setStagedEdge;
    function clicked() {
      setStagedEdge(originVertex, destinationVertex)

      d3.select(".edge-delete-button").remove()
      d3.select(".vertex-delete-button").remove()

      // reveal the deletion button
      const killButton = svg
        .append('rect')
        .attr("class", 'edge-delete-button')
        .attr("width", 10)
        .attr("height", 10)
        .attr('x', x-20)
        .attr('y', y-20)
        .attr("rx", 4)
        .style("fill", "red")
        .style("stroke", "red")
        .raise()

      killButton.on("click", () => removeEdge(originVertex, destinationVertex));

      // stage this knob for polarity assignment
    }

    edgeKnob.attr("fill", "#039BE5")
      .attr("stroke", "#039BE5")
      .attr("class", "edge-knob")
      .attr("r", radius)
      .attr("cx", () => x)
      .attr("cy", () => y)
      .on("click", clicked)
      .raise();
  }
  shuffle(array: any[]) {
    let currentIndex = array.length,  randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex != 0) {

      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;

      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }

    return array;
  }

  drawEdges(originVertex: [number, number], destinationVertex: [number, number], t: string = "neutral", className="") {
    const svg = this.d3
    const shuffle = this.shuffle
    interface LineStyleMap {
      [key: string]: [string, string]
    }

    interface OffsetMap {
      [key: string]: [number, number]
    }

    const dict: LineStyleMap = {
      "neutral": ["initial-line", "steelblue"],
      "positive": ["positive-line", "green"],
      "negative": ["negative-line", "red"]
    }

    type CardinalDirection = "north" | "south" | "east" | "west";

    const offsetDict: OffsetMap = {
      "north": [45, -10],
      "west": [-5, 30],
      "east": [105, 30],
      "south": [45, 105],
    };

    function getDirection(origin: [number, number], destination: [number, number]): [CardinalDirection, CardinalDirection] {
      let fromDirections: CardinalDirection[] = ["north", "south", "east", "west"];
      let toDirections: CardinalDirection[] = ["north", "south", "east", "west"];
      // remove south from origin potential and north from destination if destination has a lesser y
      if(destination[1] < origin[1]) {
        fromDirections = fromDirections.filter((d) => d !== "south");
        toDirections = toDirections.filter((d) => d !== "north");
      }

      // remove north from origin potential and south from destination if destination has a greater y
      if(destination[1] > origin[1]) {
        fromDirections = fromDirections.filter((d) => d !== "north");
        toDirections = toDirections.filter((d) => d !== "south");
      }

      // remove east from origin potential and west from destination if destination has a lesser x
      if(destination[0] < origin[0]) {
        fromDirections = fromDirections.filter((d) => d !== "east");
        toDirections = toDirections.filter((d) => d !== "west");
      }

      // remove west from origin potential and east from destination if destination has a greater x
      if(destination[0] > origin[0]) {
        fromDirections = fromDirections.filter((d) => d !== "west");
        toDirections = toDirections.filter((d) => d !== "east");
      }

      return [fromDirections[0], toDirections[1]]
    }

    const directions = getDirection(originVertex, destinationVertex)

    const originOffset =  offsetDict[directions[0]];
    const destinationOffset =  offsetDict[directions[1]];

    const polarityFields: [string, string] = dict[t];

    const offsetOrigin = [originVertex[0] + originOffset[0], originVertex[1] + originOffset[1]]
    const offsetDestination = [destinationVertex[0] + destinationOffset[0], destinationVertex[1] + destinationOffset[1]];

    const marker = `url(#arrow-${t})`
    console.log("@@marker", marker);

    const line = svg.append("line")
        .attr("class", polarityFields[0])
        .attr("class", className)
        .attr("stroke", polarityFields[1])
        .attr("stroke-width", "3px")
        .attr("stroke-linecap", "round")
        .attr('marker-end', marker)
        .attr("x1", offsetOrigin[0])
        .attr("y1", offsetOrigin[1])
        .attr("x2", offsetDestination[0])
        .attr("y2", offsetDestination[1]);

    var x = (offsetDestination[0] + offsetOrigin[0]) / 2;
    var y = (offsetDestination[1] + offsetOrigin[1]) / 2;

    let origin = "",
        destination = "";

    for(const key of Object.keys(this.graphRecord)) {
      const coords = this.graphRecord[key].coordinates;
      if(coords[0] === originVertex[0] && coords[1] === originVertex[1]) {
        origin = key;
      }

      if(coords[0] === destinationVertex[0] && coords[1] === destinationVertex[1]) {
        destination = key;
      }
    }

    this.drawEdgeKnob(x, y, origin, destination)
    
    // if(this.userPlacedEdge) {
    //   runWidgetEventConditions(this, this.onFirstEdgeAddition, this.$props.id);
    //   this.updateWidget('userPlacedEdge', true)
    // }
    // runWidgetEventConditions(this, this.onEdgeAddition, this.$props.id);

    // const imgPromise = new Promise((res, rej) => {
    //   console.log("promise!")
    //   const c = document.getElementById("case-content");
    //   const setCurrentSnapshot = this.setCurrentSnapshot;
  
    //   if(c) {
    //     html2canvas(c).then((canvas: any) => {
    //         const base64image = canvas.toDataURL("image/png");
    //         setCurrentSnapshot(base64image);
    //     });
    //   }

    // })
    // imgPromise;
    
    
  }

  drawGraph() {
    if(Object.keys(this.graphRecord).length) {
      for(const key of Object.keys(this.graphRecord)) {
        this.graphNodes.push(key)
        let [x, y] = this.graphRecord[key].coordinates
        x = x + 250;
        y = y+50;

        console.info("draw!", {x, y})

        this.drawVertexToSVG(key, x, y);

        for(const n of this.graphRecord[key].neutralNeighbors) {
          this.drawEdges(this.graphRecord[key].coordinates, this.graphRecord[n].coordinates);
        }
        for(const n of this.graphRecord[key].positiveNeighbors) {
          this.drawEdges(this.graphRecord[key].coordinates, this.graphRecord[n].coordinates, "positive");
        }
        for(const n of this.graphRecord[key].negativeNeighbors) {
          this.drawEdges(this.graphRecord[key].coordinates, this.graphRecord[n].coordinates, "negative");
        }
      }
    }

  }

  setCurrentSnapshot(snapshot: string) {
    this.currentSnapshot = snapshot;
  }

  setDefs() {
    const markerBoxWidth = 10;
    const markerBoxHeight = 10;
    const arrowPoints: [number, number][] = [[0, 0], [0, 10], [10, 5]];
    const refX = 5;
    const refY = 5;

    const defs = this.d3
    .append('defs');

    defs
    .append('marker')
    .attr('id', 'arrow-positive')
    .attr('viewBox', [0, 0, markerBoxWidth, markerBoxHeight])
    .attr('refX', refX)
    .attr('refY', refY)
    .attr('markerWidth', markerBoxWidth)
    .attr('markerHeight', markerBoxHeight)
    .attr('orient', 'auto-start-reverse')
    .append('path')
    .attr('d', d3.line()(arrowPoints))
    .attr('stroke', "green")
    .attr('fill', "green")

    defs
    .append('marker')
    .attr('id', 'arrow-negative')
    .attr('viewBox', [0, 0, markerBoxWidth, markerBoxHeight])
    .attr('refX', refX)
    .attr('refY', refY)
    .attr('markerWidth', markerBoxWidth)
    .attr('markerHeight', markerBoxHeight)
    .attr('orient', 'auto-start-reverse')
    .append('path')
    .attr('d', d3.line()(arrowPoints))
    .attr('stroke', "red")
    .attr('fill', "red")

    defs
    .append('marker')
    .attr('id', 'arrow-neutral')
    .attr('viewBox', [0, 0, markerBoxWidth, markerBoxHeight])
    .attr('refX', refX)
    .attr('refY', refY)
    .attr('markerWidth', markerBoxWidth)
    .attr('markerHeight', markerBoxHeight)
    .attr('orient', 'auto-start-reverse')
    .append('path')
    .attr('d', d3.line()(arrowPoints))
    .attr('stroke', "steelblue")
    .attr('fill', "steelblue")
  }

  // lifecycle hook...
  mounted() {
    const inventoryOn = this.inventoryOn;
    const toolbarOn = this.toolbarOn; //@ts-ignore
    const disabled = this.disabled;
    
    //@ts-ignore
    this.seed = this.modelConfig
    
    // fetch(this.modelConfig)
    //   .then((res) => res.json())
    //   .then((data) => {
    //     this.seed = data;
    //   })
    // const sharedDataReadKey = this.$props.sharedDataReadKey;
    // if (sharedDataReadKey) {
    //   const sharedValueOverride = this.propSharedDataOverride("graphRecord", sharedDataReadKey) as string;
    //   const gr = JSON.parse(sharedValueOverride)
    //   this.graphRecord = gr;

		// 	// this.updateWidget("graphRecord", gr);

    //   if (this.$props.sharedDataWriteKey) {
    //     this.updateSharedDataVal(this.$props.sharedDataWriteKey, JSON.stringify(this.graphRecord));
    //   }
		// }

    const selection = document.getElementById("modeling-svg"); //@ts-ignore
    if(selection) {
      const rect = selection.getBoundingClientRect();
      this.d3 = d3
      .select("#modeling-svg")
      .append("svg")
      .attr("class", "model")
      .attr("xmlns:xhtml", "http://www.w3.org/1999/xhtml")
      .attr("viewBox", "0 0 " + rect.width + " " + rect.height)
      .attr("preserveAspectRatio", "xMidYMid meet")
    }
    this.drawGraph();
    this.setDefs();

  }
}
</script>
<style lang="css" scoped>
 .ModelingWidget {
  font-family: 'Roboto', sans-serif;
  /* width: 900px; */
  aspect-ratio: 4 / 3;
 }
 
 .ModelingWidget {
  display: grid;
  background-color: white;
  grid-template-columns: 26% 74%;
  grid-template-rows: 80% 20%;
  grid-template-areas:
    "a b"
    "a c";
}
.ModelingWidget-Inventory {
  grid-area: a;
  background-color: #D9D9D9;
}
.ModelingWidget-CanvasContainer {
  grid-area: b;
}
.ModelingWidget-Controls {
  grid-area: c;
}

.ModelingWidget-InventoryHeader {
  display: grid;
  justify-content: center;
  align-content: center;
  border-bottom: 1px solid #aaa;
  padding: 4%;
}

.ModelingWidget-Inventory{
  grid-area: a;
  background-color: #D9D9D9;
  margin: 16% 0 23%;
  border-top-right-radius: 15px;
  border-bottom-right-radius: 15px;
  box-shadow: 2px 5px 9px #aaa;

}

.ModelingWidget-InventoryBody {
  padding: 5px;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr 1fr;
  display: grid;
  height: 85%;

}

.ModelingWidget-InventoryPageControls {
  display: grid;
  grid-template-columns: auto auto auto;
  justify-items: center;
}

.ModelingWidget-InventoryVertexImage {
  height: 50px;
  width: 50px;
  background-color: #6b767d;
  border-radius: 5px;
}

.ModelingWidget-InventoryVertex {
  display: grid;
  grid-template-rows: auto auto;
  justify-items: center;
  text-align: center;
  font-weight: 600;
  font-size: 12px;
  cursor: grab;
}

.ModelingWidget-InventoryVertex:active {
  cursor: grabbing
}

.ModelingWidget-InventoryVertex--disabled,
.ModelingWidget-InventoryVertex--disabled:active {
  opacity: 0.5;
  cursor: default;
}

.ModelingWidget-InventoryVertexTitle {
  color: #333;
  font-family: 'Roboto', sans-serif
}

.ModelingWidget-InventoryVertexGroup {
   border-radius: 5px;
   border: 1px solid #c4c4c4;
   grid-column-start: 1;
   grid-column-end: 3;
   display: grid;
   grid-template-columns: 1fr 1fr;
   margin-top: 25px;
}
.ModelingWidget-InventoryVertexGroupTitle {
  text-align: center;
  background-color: #d9d9d9;
  margin-top: -20px;
  width: 60%;
  justify-self: center;
}

.ModelingWidget-InventoryVertexGroup {
  padding: 5px;
  padding-top: 10px;
  grid-template-rows: 10px 100px;
  display: grid;
  grid-template-columns: auto;
}

.ModelingWidget-InventoryVertices {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.ModelingWidget-Controls {
  display: grid;
  grid-template-areas:
  "e a b"
  "e a d";
  grid-template-columns: 1fr 1fr 1fr;
  grid-column-gap: 10px;
  grid-row-gap: 10px;
  grid-template-rows: 1fr 1fr;
  width: 375px;
  height: 90px;
  justify-content: center;
  padding-left: 75px;
  padding-top: 25px;
  align-content: center;

}

.ModelingWidget-BuildRelationship {
  grid-area: a;
  font-family: 'Roboto', sans-serif;
  border-radius: 10px;
  border: 3px solid #59beec;
  font-weight: 600;
  font-family: 'Roboto', sans-serif;
  background: linear-gradient(#7CD5FE, #59beec);
}

.ModelingWidget-BuildRelationship:hover {
  background: linear-gradient(#59beec, #7CD5FE);
}

.ModelingWidget-BuildRelationship--disabled {
  opacity: 0.5;
  background: white;
}

.ModelingWidget-Positive {
  grid-area: b;
  border: 3px solid #00A84E;
  border-radius: 10px;
  font-weight: 600;
  background-color: white;
  font-family: 'Roboto', sans-serif;
}

.ModelingWidget-Positive:hover {
  background-color: rgba(0, 168, 78, 0.3);
}

.ModelingWidget-Negative:hover {
  background-color: rgba(180, 57, 40, 0.3)
}

.ModelingWidget-ClearRelationships:hover {
  background-color: rgba(128, 128, 128, 0.3)
}

.ModelingWidget-Negative--disabled {
  opacity: 0.5;
}

.ModelingWidget-Positive--enabled {
  opacity: 0.5;
}

.ModelingWidget-Negative {
  grid-area: d;
  border: 3px solid #B43928;
  border-radius: 10px;
  font-weight: 600;
  background-color: white;
  font-family: 'Roboto', sans-serif;
}

.ModelingWidget-ClearRelationships {
  grid-area: e;
  border: 3px solid black;
  border-radius: 10px;
  font-weight: 600;
  background-color: white;
  font-family: 'Roboto', sans-serif;
}

.ModelingWidget-CanvasContainer {
  height: 100%;
  width: 100%;
}

.foobar {
  display: inline-block;
  vertical-align: middle;
  z-index: 2;
  position: absolute;
  top: 40%;
  left: 30%;
}

.fizzbuzz {
  display: inline-block;
  vertical-align: middle;
  z-index: 2;
  position: absolute;
  top: 40%;
  left: 40%;
}


</style>