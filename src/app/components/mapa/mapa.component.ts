import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { WebsocketService } from '../../services/websocket.service';
import { Lugar } from '../../interfaces/interfaces';

import * as mapboxgl from 'mapbox-gl';

interface RespMarcadores {
  [ key: string ]: Lugar
}


@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.component.html',
  styleUrls: ['./mapa.component.css']
})
export class MapaComponent implements OnInit {

  mapa: mapboxgl.Map;
  // lugares: Lugar[] = [];
  lugares: RespMarcadores = {};
  markersMapbox: { [id:string]: mapboxgl.Marker } = {}


  constructor( private http: HttpClient,
               private wsService: WebsocketService ) { }

  ngOnInit() {

    this.http.get<RespMarcadores>('http://localhost:5000/mapa')
      .subscribe( lugares => {
        // console.log(lugares);
        this.lugares = lugares;
        this.crearMapa();
      });

    this.escucharSockets();
  }

  escucharSockets() {

    // marcador-nuevo
    this.wsService.listen('marcador-nuevo')
      .subscribe( (marcador: Lugar) => this.agregarMarcador( marcador ) );

    // marcador-mover
    this.wsService.listen( 'marcador-mover' )
      .subscribe( (marcador:Lugar) => {

        this.markersMapbox[ marcador.id ]
          .setLngLat([ marcador.lng, marcador.lat ])

      });
    

    // marcador-borrar
    this.wsService.listen('marcador-borrar')
      .subscribe( (id: string) => {
        this.markersMapbox[id].remove();
        delete this.markersMapbox[id];
      });
  }

  crearMapa() {
    
    (mapboxgl as any).accessToken = 'pk.eyJ1Ijoia2xlcml0aCIsImEiOiJjanY2MXdrd3EwMG1xNDRvNWQzYjJmZmlqIn0.mD7ZsvgGK0mYl2NpqqmPVw';

    this.mapa = new mapboxgl.Map({
      container: 'mapa',
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [-75.75512993582937, 45.349977429009954],
      zoom: 15.8
    });

    for( const [id, marcador] of Object.entries(this.lugares) ) {
      this.agregarMarcador( marcador );
    }

  }

  agregarMarcador( marcador: Lugar ) {

    const h2 = document.createElement('h2');
    h2.innerText = marcador.nombre;

    const btnBorrar = document.createElement('button');
    btnBorrar.innerText = 'Borrar';

    const div = document.createElement('div');
    div.append(h2, btnBorrar);


    const customPopup = new mapboxgl.Popup({
      offset: 25,
      closeOnClick: false
    }).setDOMContent( div );

    const marker = new mapboxgl.Marker({
      draggable: true,
      color: marcador.color
    })
    .setLngLat([marcador.lng, marcador.lat])
    .setPopup( customPopup )
    .addTo( this.mapa );


    marker.on('drag', () => {
      const lngLat = marker.getLngLat();

      const nuevoMarcador = {
        id: marcador.id,
        ...lngLat
      }

      this.wsService.emit( 'marcador-mover', nuevoMarcador );

    });

    btnBorrar.addEventListener( 'click', () => {
      marker.remove();
      this.wsService.emit( 'marcador-borrar', marcador.id );
    });

    this.markersMapbox[ marcador.id ] = marker;

  }

  crearMarcador() {

    const customMarker: Lugar = {
      id: new Date().toISOString(),
      lng: -75.75512993582937, 
      lat: 45.349977429009954,
      nombre: 'Sin Nombre',
      color: '#' + Math.floor(Math.random()*16777215).toString(16) 
    }

    this.agregarMarcador( customMarker );

    // emitir marcador-nuevo
    this.wsService.emit( 'marcador-nuevo', customMarker );

  }

}
