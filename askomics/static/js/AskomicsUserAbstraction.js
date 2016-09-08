/*jshint esversion: 6 */

/*
  CLASSE AskomicsUserAbstraction
  Manage Abstraction storing in the TPS.
*/
var AskomicsUserAbstraction = function () {
    'use strict';
    const prefix = {
      'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      'xsd': 'http://www.w3.org/2001/XMLSchema#',
      'rdfs':'http://www.w3.org/2000/01/rdf-schema#',
      'owl': 'http://www.w3.org/2002/07/owl#'
    };
    /* Ontology is save locally to avoid request with TPS  */
    /* --------------------------------------------------- */
    var tripletSubjectRelationObject = [];
    var entityInformationList = {}; /*   entityInformationList[uri1][rel] = uri2 ; */
    var attributesEntityList = {};  /*   attributesEntityList[uri1] = [ att1, att2,... ] */
    /* uri ->W get information about ref, taxon, start, end */
    var entityPositionableInformationList = {}; /*   entityPositionableInformationList[uri1] = { taxon, ref, start, end } */


    AskomicsUserAbstraction.prototype.getEntities = function() {
      return JSON.parse(JSON.stringify(Object.keys(entityInformationList))) ;
    };

    AskomicsUserAbstraction.prototype.getAttributesEntity = function(uriEntity) {
      return JSON.parse(JSON.stringify(attributesEntityList[uriEntity])) ;
    };

    AskomicsUserAbstraction.prototype.getPositionableEntities = function() {
      return JSON.parse(JSON.stringify(entityPositionableInformationList)) ;
    };
    /*
    load ontology
    see template SPARQL to know sparql variable
    */
    /* Request information in the model layer */
    //this.updateOntology();
    AskomicsUserAbstraction.prototype.loadUserAbstraction = function() {
      var service = new RestServiceJs("userAbstraction");

      service.postsync({}, function(resultListTripletSubjectRelationObject ) {
      console.log("========================= ABSTRACTION =====================================================================");
      /* All relation are stored in tripletSubjectRelationObject */
      tripletSubjectRelationObject = resultListTripletSubjectRelationObject.relations;
      entityInformationList = {};
      entityPositionableInformationList = {};
      attributesEntityList = {};
      /* All information about an entity available in TPS are stored in entityInformationList */
      for (let entry in resultListTripletSubjectRelationObject.entities){
        console.log("ENTITY:"+JSON.stringify(resultListTripletSubjectRelationObject.entities[entry]));
        var uri = resultListTripletSubjectRelationObject.entities[entry].entity;
        var rel = resultListTripletSubjectRelationObject.entities[entry].property;
        var val = resultListTripletSubjectRelationObject.entities[entry].value;

        if ( ! (uri in entityInformationList) ) {
            entityInformationList[uri] = {};
        }
        entityInformationList[uri][rel] = val;
      }

      var attribute = {};

	    for (let entry2 in resultListTripletSubjectRelationObject.attributes){
        console.log("ATTRIBUTE:"+JSON.stringify(resultListTripletSubjectRelationObject.attributes[entry2]));
        var uri2 = resultListTripletSubjectRelationObject.attributes[entry2].entity;
        attribute = {};
        attribute.uri  = resultListTripletSubjectRelationObject.attributes[entry2].attribute;
        attribute.label = resultListTripletSubjectRelationObject.attributes[entry2].labelAttribute;
        attribute.type  = resultListTripletSubjectRelationObject.attributes[entry2].typeAttribute;

          if ( ! (uri2 in attributesEntityList) ) {
              attributesEntityList[uri2] = [];
          }

          attributesEntityList[uri2].push(attribute);
          //TODO Force label in the first position to print the label at the first position
        }

        for (var entry3 in resultListTripletSubjectRelationObject.categories){
          console.log("CATEGORY:"+JSON.stringify(resultListTripletSubjectRelationObject.categories[entry3]));
          var uri3 = resultListTripletSubjectRelationObject.categories[entry3].entity;
          attribute = {};
          attribute.uri  = resultListTripletSubjectRelationObject.categories[entry3].category;
          attribute.label = resultListTripletSubjectRelationObject.categories[entry3].labelCategory;
          attribute.type  = resultListTripletSubjectRelationObject.categories[entry3].typeCategory;

          if ( ! (uri3 in attributesEntityList) ) {
              attributesEntityList[uri3] = [];
          }

          attributesEntityList[uri3].push(attribute);
          //TODO Force label in the first position to print the label at the first position
        }

        for (var entry4 in resultListTripletSubjectRelationObject.positionable){
          console.log('POSITIONABLE:'+JSON.stringify(resultListTripletSubjectRelationObject.positionable[entry4]));
          var uri4 = resultListTripletSubjectRelationObject.positionable[entry4].entity;
          if ( ! (uri4 in entityPositionableInformationList) ) {
              entityPositionableInformationList[uri4] = {};
              entityPositionableInformationList[uri4].taxon = ":position_taxon";
              entityPositionableInformationList[uri4].ref = ":position_ref";
              entityPositionableInformationList[uri4].strand = ":position_strand";
              entityPositionableInformationList[uri4].start = ":position_start";
              entityPositionableInformationList[uri4].end = ":position_end";
          } else {
            throw new Error("URI:"+uri4+" have several taxon,ref, start, end labels... "+JSON.stringify(entityPositionableInformationList[uri4]));
          }
        }
      });
    };

    /* Get value of an attribut with RDF format like rdfs:label */
    AskomicsUserAbstraction.prototype.getAttrib = function(uriEntity,attrib) {
        if (!(uriEntity in entityInformationList)) {
          console.log(JSON.stringify(uriEntity) + " is not referenced in the user abstraction !");
          return "<unknown>";
        }
        var attrib_longterm = attrib ;
        for (var p in prefix) {
          var i = attrib_longterm.search(p+":");
          if ( i != - 1) {
            attrib_longterm = attrib_longterm.replace(p+":",prefix[p]);
            break;
          }
        }

        if (!(attrib_longterm in entityInformationList[uriEntity])) {
          console.log(JSON.stringify(uriEntity) + '['+JSON.stringify(attrib)+']' + " is not referenced in the user abstraction !");

          return "<unknown>";
        }

        return entityInformationList[uriEntity][attrib_longterm];
    };

    /* build node from user abstraction infomation */
    AskomicsUserAbstraction.prototype.buildBaseNode  = function(uriEntity) {
      var node = {
        uri   : uriEntity,
        label : this.getAttrib(uriEntity,'rdfs:label')
      } ;
      return node;
    };


    /*
    Get
    - relations with UriSelectedNode as a subject or object
    - objects link with Subject UriSelectedNode
    - Subjects link with Subject UriSelectedNode
     */

    AskomicsUserAbstraction.prototype.getRelationsObjectsAndSubjectsWithURI = function(UriSelectedNode) {

      var objectsTarget = {} ;
      var subjectsTarget = {} ;

      for (var i in tripletSubjectRelationObject) {
        if ( tripletSubjectRelationObject[i].object == UriSelectedNode ) {
          if (! (tripletSubjectRelationObject[i].subject in subjectsTarget) ) {
            subjectsTarget[tripletSubjectRelationObject[i].subject] = [];
          }
          subjectsTarget[tripletSubjectRelationObject[i].subject].push(tripletSubjectRelationObject[i].relation);
        }
        if ( tripletSubjectRelationObject[i].subject == UriSelectedNode ) {
          if (! (tripletSubjectRelationObject[i].object in objectsTarget) ) {
            objectsTarget[tripletSubjectRelationObject[i].object] = [];
          }
          objectsTarget[tripletSubjectRelationObject[i].object].push(tripletSubjectRelationObject[i].relation);
        }
      }
      // TODO: Manage Doublons and remove it....

      return [objectsTarget, subjectsTarget];
    };

    /* return a list of attributes according a uri node */
    AskomicsUserAbstraction.prototype.getAttributesWithURI  = function(UriSelectedNode) {
      return attributesEntityList[UriSelectedNode];
    };

    AskomicsUserAbstraction.prototype.isPositionable  = function(Uri) {
      return (Uri in entityPositionableInformationList);
    };

    AskomicsUserAbstraction.prototype.isGoterm  = function(Uri) {
      // TODO using prefix.cc to update entityInformationList
      console.log(Uri);
      return (Uri === "http://purl.org/obo/owl/GO#term");
    };

  };
