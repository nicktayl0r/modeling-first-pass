export interface WidgetData {
  isInventoryActive: boolean;
  isButtonsActive: boolean;
  seed: Seed
}


export interface Seed {
  inventory: Inventory
  subgraphs: SubGraphSet;
}

interface SubGraphSet { // tentative
  correctSubGraph: any;
  partialCreditSubgraphs: any[]
}

interface Inventory {
  title?: string;
  availableVertices: (_Vertex|VertexGroup)[];
}

interface _Vertex {
  type: "single";
  title: string;
  imgPath: string;
  pageIndex?: number;
}

interface VertexGroup {
  type: "group";
  title: string;
  vertices: _Vertex[];
  pageIndex: number;
}

export interface Graph {
  [key: string]: Vertex;
}
export type Solutions = [string, "increase" | "decrease"][]

export interface Vertex {
  name: string;
  id: string;
  positiveNeighbors: string[];
  negativeNeighbors: string[];
  neutralNeighbors: string[];
  coordinates: [number, number];
  solved: any;

}