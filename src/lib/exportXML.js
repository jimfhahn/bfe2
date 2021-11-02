// import store from "../store";
import lookupUtil from "./lookupUtil";
import uiUtils from "./uiUtils";
import parseProfile from "./parseProfile";
import config from "./config";




const parser = new DOMParser();


const exportXML = {

	namespace: {
		'bflc': 'http://id.loc.gov/ontologies/bflc/',
		'bf':'http://id.loc.gov/ontologies/bibframe/',	
		'bfsimple':'http://id.loc.gov/ontologies/bfsimple/',
		'madsrdf': 'http://www.loc.gov/mads/rdf/v1#',
		'rdfs':'http://www.w3.org/2000/01/rdf-schema#',
		'rdf' : 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
		'lclocal':'http://id.loc.gov/ontologies/lclocal/', 		
		'pmo' :'http://performedmusicontology.org/ontology/',
		'datatypes': 'http://id.loc.gov/datatypes/',
		'xsd': 'http://www.w3.org/2001/XMLSchema#',
		'void':'http://rdfs.org/ns/void#',
		'mstatus': 'https://id.loc.gov/vocabulary/mstatus/',
		'mnotetype': 'http://id.loc.gov/vocabulary/mnotetype/'

	},


	// ignore these beause we do something very structural to the document 
	ignoreProperties: [

		'http://id.loc.gov/ontologies/bibframe/instanceOf',
		'http://id.loc.gov/ontologies/bibframe/hasItem',
		'http://id.loc.gov/ontologies/bibframe/itemOf',
		'http://id.loc.gov/ontologies/bibframe/hasInstance',
		'http://id.loc.gov/ontologies/bibframe/Work'

	],

	debugHistory: [],

	// from URI to prefixed
	namespaceUri: function(uri){	
		for (let ns in this.namespace){
			let nsuri = this.namespace[ns]
			if (uri.includes(nsuri)){
				return uri.replace(nsuri,`${ns}:`)
			}

		}


	},

	// from prefiex to URI
	UriNamespace: function(passedNS){

		for (let ns in this.namespace){
			let nsuri = this.namespace[ns]

			if (passedNS.startsWith(`${ns}:`)){
				return passedNS.replace(`${ns}:`,nsuri)
			}

		}

	},


	createElByBestNS: function(elStr){



		// if the elString is not a expanded URI
		if (!elStr.startsWith('http')){
			elStr = this.UriNamespace(elStr)
		}

		for (let ns of Object.keys(this.namespace)){

			if (elStr.startsWith(this.namespace[ns])){
				
				// console.log(elStr)
				// console.log(this.namespace[ns])
				// console.log(this.namespaceUri(elStr))
				return document.createElementNS(this.namespace[ns],this.namespaceUri(elStr))
			}

			//rdf.setAttributeNS("http://www.w3.org/2000/xmlns/", `xmlns:${ns}`, this.namespace[ns])

		}

		console.error('could not find namespace for ', elStr)
		return null
	},

	specialTransforms: {

		// not used curently


	},


	suggestType: async function(propertyURI){

		

		// at this point we have a well cached lookup of the whole onotlogy in localstorage
		// ask for this one, if it idoesnt have it, it will relookup (or if it is expired)
		let propXml = await lookupUtil.fetchOntology(propertyURI)
		let prop = parser.parseFromString(propXml, "text/xml");
		let range = prop.getElementsByTagName("rdfs:range")

		// if it has a range return it
		if (range.length>0){
			range=range[0]
			if (range.attributes['rdf:resource']){
				return range.attributes['rdf:resource'].value
			}
		}

		let profileLookup = parseProfile.suggestType(propertyURI)
		if (profileLookup != false){
			return profileLookup
		}

		// some try something else
		// TODO if needed


		// some properties being used are not available yet....
		if (propertyURI==='http://id.loc.gov/ontologies/bfsimple/prefTitle'){
			return 'http://www.w3.org/2000/01/rdf-schema#Literal'
		}
		if (propertyURI==='http://id.loc.gov/ontologies/bfsimple/variantTitle'){
			return 'http://www.w3.org/2000/01/rdf-schema#Literal'
		}
		if (propertyURI==='http://id.loc.gov/ontologies/bfsimple/transTitle'){
			return 'http://www.w3.org/2000/01/rdf-schema#Literal'
		}






		// if fails
		return false





	},



	toBFXML: async function(profile){


		// if we are doing local dev then just error out, but if not show a message
		if (config.returnUrls().dev){

			return await this.toBFXMLProcess(profile)

		}else{

			try{
				return await this.toBFXMLProcess(profile)	
			}catch (error){

				console.error(error);

				alert("There was an error building the XML - Please 'Report Error'")
				return false
			}


		}




		


	},


	hasUserValue: function(userValue){
	

		for (let key in userValue){

			if (key == '@id' || key.includes('http://') || key.includes('https://')){
				return true
			}
		}

		return false
	},

	needsNewPredicate: function(key) {

		if (key == 'http://www.loc.gov/mads/rdf/v1#componentList'){
			return false
		}


		return true


	},

	isBnode: function(userValue){
	

		// if it has any nested data it is a bnode
		// for (let key in userValue){
		// 	if (Array.isArray(userValue[key])){
		// 		return true
		// 	}
		// }
		if (userValue['@type']){
			return true
		}


		return false
	},

	debug: function(uri, msg, userValue, other1, other2, other3){

		let print = false

		if (print) console.log('-----------------START-------------------')

		let info = []
		if (uri){
			info.push(uri)
			if (print) console.log(uri)
		}

		if (msg){
			info.push(msg)
			if (print) console.log(msg)
		}
		if (userValue){
			info.push(userValue)
			if (print) console.log(JSON.stringify(userValue,null,2))
		}
		if (other1){
			info.push(other1)
			if (print) console.log(other1)
		}
		if (other2){
			info.push(other2)
			if (print) console.log(other2)
		}
		if (other3){
			info.push(other3)
			if (print) console.log(other3)
		}

		if (print) console.log('------------------END-------------------')

		this.debugHistory.push(info)

	},


	createBnode: function(userValue,property){

		console.log(property,userValue)

		// some special cases here
		if (property == 'http://id.loc.gov/ontologies/bibframe/agent'){

			// if it is an agent create the Agent bnode and just add the type to it as rdd:type
			let bnode = this.createElByBestNS('bf:Agent')
			if (userValue['@id']){
				bnode.setAttributeNS(this.namespace.rdf, 'rdf:about', userValue['@id'])						
			}

			let rdftype = this.createElByBestNS('rdf:type')

			rdftype.setAttributeNS(this.namespace.rdf, 'rdf:resource', userValue['@type'])						

			bnode.appendChild(rdftype)

			if (userValue['@parseType']){
				bnode.setAttribute('rdf:parseType', userValue['@parseType'])
			}

			console.log(bnode)

			return bnode


		}else if (userValue['@type'] && userValue['@type'].includes('id.loc.gov/vocabulary/mnotetype')){


			// if it is this specific note vocabulary type then create a bf:Note with a RDF type in it

			let bnode = this.createElByBestNS('bf:Note')
			let rdftype = this.createElByBestNS('rdf:type')

			rdftype.setAttributeNS(this.namespace.rdf, 'rdf:resource', userValue['@type'])						
			
			bnode.appendChild(rdftype)

		
			console.log(bnode)


			return bnode

		}else{


			// just normally make it

			let bnode = this.createElByBestNS(userValue['@type'])
			if (userValue['@id']){
				bnode.setAttributeNS(this.namespace.rdf, 'rdf:about', userValue['@id'])						
			}
			if (userValue['@parseType']){
				bnode.setAttribute('rdf:parseType', userValue['@parseType'])

			}
			

			return bnode

		}




		
	},

	createLiteral: function(property,userValue){

		console.log(property)
		let p = this.createElByBestNS(property)
		console.log(p)
		console.log(userValue)
		// it should be stored under the same key
		if (userValue[property]){
			p.innerHTML = userValue[property]
		}

		// does it also have a URI?
		if (userValue['@id']){


			p.setAttributeNS(this.namespace.rdf, 'rdf:resource', userValue['@id'])

		}
		if (userValue['@datatype']){
			p.setAttributeNS(this.namespace.rdf, 'rdf:datatype', userValue['@datatype'])

		}

		if (userValue['@language']){
			p.setAttribute('xml:lang', userValue['@language'])

		}
		if (userValue['@parseType']){
			p.setAttribute('rdf:parseType', userValue['@parseType'])

		}



		// doesnt work :(
		// p.removeAttributeNS("http://www.w3.org/2000/xmlns/", 'xmlns:rdfs')


		return p
	},

	toBFXMLProcess: async function(profile){

		this.debugHistory = []

		let orginalProfile = profile
		// cut the ref to the orginal
		profile = JSON.parse(JSON.stringify(profile))




		let tleWork = []
		let tleInstance = []
		let tleItem = []

		let rdf = document.createElementNS(this.namespace.rdf, "RDF");
		let rdfBasic = document.createElementNS(this.namespace.rdf, "RDF");


		for (let ns of Object.keys(this.namespace)){
			
			rdf.setAttributeNS("http://www.w3.org/2000/xmlns/", `xmlns:${ns}`, this.namespace[ns])
			rdfBasic.setAttributeNS("http://www.w3.org/2000/xmlns/", `xmlns:${ns}`, this.namespace[ns])

		}

		let xmlVoidDataRtsUsed = []
		let xmlVoidDataType = []
		let xmlVoidExternalID = []
		let xmlVoidDataTitle = ""
		let xmlVoidDataContributor = ""
		let xmlVoidDataLccn = ""

		
		let tleLookup = {
			Work: {},
			Instance: {},
			Item: {},
			Hub:{}
		}


		for (let rt of profile.rtOrder){



			if (profile.rt[rt].noData) continue

				

			let tleArray // eslint-disable-line
			let rootEl
			let rootElName

			if (rt.includes(':Work')){
				tleArray = tleWork
				rootEl = document.createElementNS(this.namespace.bf,"bf:Work");
				rootElName = "Work"
			}else if (rt.includes(':Instance')){
				tleArray = tleInstance
				rootEl = document.createElementNS(this.namespace.bf,"bf:Instance");
				rootElName = "Instance"
			}else if (rt.includes(':Item')){
				tleArray = tleItem
				rootEl = document.createElementNS(this.namespace.bf,"bf:Item");
				rootElName = "Item"
			}else if (rt.endsWith(':Hub')){
				tleArray = tleItem
				rootEl = document.createElementNS(this.namespace.bf,"bf:Hub");
				rootElName = "Hub"
			}else{
				// don't mess with anything that is not a top level entitiy in the profile, there can be other referenced RTs that we don't want to export they are just used in the main RT
				continue
			}


			// rdf.appendChild(rootEl,tleArray)
			// console.log(tleArray)
			
			if (profile.rt[rt].URI){
				rootEl.setAttributeNS(this.namespace.rdf, 'rdf:about', profile.rt[rt].URI)
				xmlVoidExternalID.push(profile.rt[rt].URI)
			}
			if (profile.rt[rt]['@type']){
				let type = this.createElByBestNS('http://www.w3.org/1999/02/22-rdf-syntax-ns#type')
				type.setAttributeNS(this.namespace.rdf, 'rdf:resource', profile.rt[rt]['@type'])
				rootEl.appendChild(type)				
			}


			for (let pt of profile.rt[rt].ptOrder){

				let ptObj = profile.rt[rt].pt[pt]

				let userValue = ptObj.userValue

				if (this.ignoreProperties.indexOf(ptObj.propertyURI) > -1){
					continue
				}

				console.log('--->',pt)
				// does it even have any userValues?
				if (this.hasUserValue(userValue)){



					// keep track of what resource teplates we used in this record
					if (xmlVoidDataRtsUsed.indexOf(rt)==-1){
						xmlVoidDataRtsUsed.push(rt)
					}
					if (xmlVoidDataType.indexOf(rootElName)==-1){
						xmlVoidDataType.push(rootElName)
					}

					if (rootElName == 'Item' && pt =='http://id.loc.gov/ontologies/bibframe/adminMetadata|Admin Metadata'){
						console.log('here')
						console.log(userValue)
					}

					console.log(userValue)

					// is it a BNODEEEEE
					if (this.isBnode(userValue)){




						this.debug(ptObj.propertyURI,'root level element, is bnode', userValue)

						let pLvl1 = this.createElByBestNS(ptObj.propertyURI)
						let bnodeLvl1 = this.createBnode(userValue, ptObj.propertyURI)



						// loop though the properties
						for (let key1 of Object.keys(userValue).filter(k => (!k.includes('@') ? true : false ) )){


							let pLvl2 = this.createElByBestNS(key1)

							if (key1 == 'http://www.loc.gov/mads/rdf/v1#componentList'){
								pLvl2.setAttribute('rdf:parseType', 'Collection')
							}


							let value1FirstLoop = true
							// loop through the value array of each of them
							for (let value1 of userValue[key1]){

								if (!value1FirstLoop && this.needsNewPredicate(key1)){
									// we are going to make a new predicate, same type but not the same one as the last one was attached to
									pLvl2 = this.createElByBestNS(key1)
								}
								

								// is it a bnode?
								console.log('value1',value1)
								if (this.isBnode(value1)){

									// yes
									
									let bnodeLvl2 = this.createBnode(value1,key1)
									pLvl2.appendChild(bnodeLvl2)
									bnodeLvl1.appendChild(pLvl2)

									// console.log('bnodeLvl2',bnodeLvl2)

									// now loop through its properties and see whats nested
									for (let key2 of Object.keys(value1).filter(k => (!k.includes('@') ? true : false ) )){

										let pLvl3 = this.createElByBestNS(key2)

										for (let value2 of value1[key2]){

											// console.log('key2',key2)

											// console.log('value2',value2)


											if (this.isBnode(value2)){

												// more nested bnode
												// one more level
												
												let bnodeLvl3 = this.createBnode(value2,key2)
												pLvl3.appendChild(bnodeLvl3)
												bnodeLvl2.appendChild(pLvl3)

												for (let key3 of Object.keys(value2).filter(k => (!k.includes('@') ? true : false ) )){

													for (let value3 of value2[key3]){

														if (this.isBnode(value3)){

															console.error("Max hierarchy depth reached, but there are more levels left:", key3, 'in', userValue )

														}else{


															for (let key4 of Object.keys(value3).filter(k => (!k.includes('@') ? true : false ) )){

																if (typeof value3[key4] == 'string' || typeof value3[key4] == 'number'){
																	// its a label or some other literal
																	let p4 = this.createLiteral(key4, value3)
																	bnodeLvl3.appendChild(p4)
																	// console.log('key4',key4, bnodeLvl3)
																}else{
																	console.error('key4', key4, value3[key4], 'not a literal, should not happen')
																}

															}



														}

													}
												}

											}else{


												for (let key3 of Object.keys(value2).filter(k => (!k.includes('@') ? true : false ) )){

													if (typeof value2[key3] == 'string' || typeof value2[key3] == 'number'){
														// its a label or some other literal
														let p3 = this.createLiteral(key3, value2)
														bnodeLvl2.appendChild(p3)
														// console.log('key3',key3, bnodeLvl2)
													}else{
														console.error('key3', key3, value2[key3], 'not a literal, should not happen')
													}

												}



											}

										}

									}




								}else{

									// no it is a literal or something else
									// loop through its keys and make the values
									let keys = Object.keys(value1).filter(k => (!k.includes('@') ? true : false ) )

									if (keys.length>0){
										for (let key2 of keys){

											if (typeof value1[key2] == 'string' || typeof value1[key2] == 'number'){
												// its a label or some other literal
												let p2 = this.createLiteral(key2, value1)
												bnodeLvl1.appendChild(p2)
											}else{
												console.error('key2', key2, value1[key2], 'not a literal, should not happen')
											}

										}
									}else if (keys.length==0 && value1['@id']){

										let p2 = this.createLiteral(key1, value1)
										bnodeLvl1.appendChild(p2)

									}else{

										console.error('Unhadled literal situtation')
									}

									


								}

								value1FirstLoop = false

							}
						}	



						pLvl1.appendChild(bnodeLvl1)
						rootEl.appendChild(pLvl1)


					}else{

						this.debug(ptObj.propertyURI, 'root level element does not look like a bnode', userValue)

						// but it might be a bnode, but with only a URI
						console.log(await this.suggestType(ptObj.propertyURI))

						if (userValue['@flags'] && userValue['@flags'].indexOf('simpleLookupTopLevelMulti') > -1){

							// an edge case here where we wanted to allow multiple simple lookups in root level fields
							// like carrierType, loop through the labels, build the properties, if it doesnt have a @id its because its at te root lvl
							
							if (userValue['http://www.w3.org/2000/01/rdf-schema#label']){

								for (let label of userValue['http://www.w3.org/2000/01/rdf-schema#label']){

									let p = this.createElByBestNS(ptObj.propertyURI)
									let bnode = this.createElByBestNS(await this.suggestType(ptObj.propertyURI))
									p.appendChild(bnode)
									rootEl.appendChild(p)

									if (label['http://www.w3.org/2000/01/rdf-schema#label']){
										let lp = this.createElByBestNS('http://www.w3.org/2000/01/rdf-schema#label')
										lp.innerHTML = label['http://www.w3.org/2000/01/rdf-schema#label']
										bnode.appendChild(lp)
									}

									if (label['@id']){
										bnode.setAttributeNS(this.namespace.rdf, 'rdf:about', label['@id'])

									}else if (userValue['@id']){
										bnode.setAttributeNS(this.namespace.rdf, 'rdf:about', userValue['@id'])
									}




								}

							}



						}else if (userValue['@type'] && userValue['@id']){

							this.debug(ptObj.propertyURI, 'But has @type, making bnode')

							let p = this.createElByBestNS(ptObj.propertyURI)
							let bnode = this.createElByBestNS(userValue['@type'])						
							bnode.setAttributeNS(this.namespace.rdf, 'rdf:about', userValue['@id'])

							p.appendChild(bnode)
							rootEl.appendChild(p)
						}else if (userValue['@type'] && !userValue['@id']){

							this.debug(ptObj.propertyURI, 'Does not have URI, error', userValue)

							console.error("Does not have URI, ERROR")
						}else if (await this.suggestType(ptObj.propertyURI) == 'http://www.w3.org/2000/01/rdf-schema#Literal'){


							// its just a top level literal property
							// loop through its keys and make the values
							for (let key1 of Object.keys(userValue).filter(k => (!k.includes('@') ? true : false ) )){

								for (let value1 of userValue[key1]){

									for (let key2 of Object.keys(value1).filter(k => (!k.includes('@') ? true : false ) )){

										if (typeof value1[key2] == 'string' || typeof value1[key2] == 'number'){
											// its a label or some other literal
											let p1 = this.createLiteral(key2, value1)
											rootEl.appendChild(p1)
										}else{
											console.error('key2', key2, value1[key2], 'not a literal, should not happen')
										}

									}
								}

							}
						
						}else if (userValue['@id']){
							// it has a URI at least, so make that
							let p = this.createElByBestNS(ptObj.propertyURI)
							p.setAttributeNS(this.namespace.rdf, 'rdf:resource', userValue['@id'])
							rootEl.appendChild(p)
						}else if (ptObj.propertyURI == 'http://www.w3.org/2000/01/rdf-schema#label'){

							// does it just have a label?
							let p = this.createElByBestNS(ptObj.propertyURI)
							p.innerHTML = userValue['http://www.w3.org/2000/01/rdf-schema#label'][0]['http://www.w3.org/2000/01/rdf-schema#label']
							rootEl.appendChild(p)


						}else{
							this.debug(ptObj.propertyURI, 'Does not have @type, something is wrong here', userValue)
							console.warn("Should not be here")
							// alert("Not everything entered was serialized into XML, please report this record and check the output.")
						}




					}



					// build the predicate
					// //
					// if (rootElName ==='Item'){
					// 	console.log(pt)
					// 	console.log(rootEl)
					// }


				}





			}
				

			// add in the admindata
			// if (orginalProfile.rt[rt].adminMetadataData){

				
			// 	let parser = new DOMParser();
			// 	let adm = parser.parseFromString(orginalProfile.rt[rt].adminMetadataData, "text/xml");

			// 	adm = adm.children[0]

			// 	if (adm.getElementsByTagName('bflc:procInfo').length>0){
			// 		adm.getElementsByTagName('bflc:procInfo')[0].remove()
			// 	}
			// 	let p = this.createElByBestNS('bflc:procInfo')
			// 	p.innerHTML = profile.rt[rt].procInfo


			// 	for (let el of adm.getElementsByTagName('bflc:generationProcess')){
			// 		for (let el2 of el.getElementsByTagName('rdfs:label')){

			// 			// remove it
			// 			if (el2.innerHTML.startsWith('BFE2')){
			// 				el.remove()
			// 			}

			// 		}
			// 	}

			// 	// add in new one
			// 	let gP = this.createElByBestNS('bf:generationProcess')
			// 	adm.appendChild(gP)
			// 	let GP = this.createElByBestNS('bf:GenerationProcess')
			// 	gP.appendChild(GP)

			// 	let GPD = this.createElByBestNS('bf:generationDate')
			// 	GPD.innerHTML = new Date().toISOString()							
			// 	GPD.setAttributeNS(this.namespace.rdf, 'rdf:datatype', 'http://www.w3.org/2001/XMLSchema#dateTime')
			// 	GP.appendChild(GPD)


			// 	let GPL = this.createElByBestNS('rdfs:label')

			// 	GPL.innerHTML = `BFE2 v${config.versionMajor}.${config.versionMinor}.${config.versionPatch}`
			// 	GP.appendChild(GPL)




			// 	adm.getElementsByTagName('bf:AdminMetadata')[0].appendChild(p)
				
				

			// 	rootEl.appendChild(adm)
			// }



			if (orginalProfile.rt[rt].unusedXml){
				
				let parser = new DOMParser();

				let unusedXmlNode = parser.parseFromString(orginalProfile.rt[rt].unusedXml, "text/xml")
				unusedXmlNode = unusedXmlNode.children[0]

				for (let el of unusedXmlNode.children){
					
					if (el.tagName != 'rdfs:label'){
						rootEl.appendChild(el)
					}

				}

			}

			


			

			// build the lookup
			console.log(orginalProfile.rt[rt])
			tleLookup[rootElName][orginalProfile.rt[rt].URI] = rootEl


		}


		
		
		

		// also just build a basic version tosave

		let parser = new DOMParser();

		
		for (let URI in tleLookup['Work']){
			
			let theWork = (new XMLSerializer()).serializeToString(tleLookup['Work'][URI])
			// theWork = theWork.replace(/\sxmlns:[a-z]+="http.*?"/g,'')
			theWork = parser.parseFromString(theWork, "text/xml").children[0];

			rdfBasic.appendChild(theWork)
		}

		for (let URI in tleLookup['Hub']){
			
			let theHub = (new XMLSerializer()).serializeToString(tleLookup['Hub'][URI])
			// theHub = theHub.replace(/\sxmlns:[a-z]+="http.*?"/g,'')
			theHub = parser.parseFromString(theHub, "text/xml").children[0];

			rdfBasic.appendChild(theHub)
		}

		

		for (let URI in tleLookup['Instance']){

			// let instance = tleLookup['Instance'][URI].cloneNode( true )

			let instance = (new XMLSerializer()).serializeToString(tleLookup['Instance'][URI])
			// instance = instance.replace(/\sxmlns:[a-z]+="http.*?"/g,'')
			instance = parser.parseFromString(instance, "text/xml").children[0];



			let items = this.returnHasItem(URI,orginalProfile,tleLookup)
			
			// alert(items.length)s
			for (let item of items){
				let uri = null
				if (item.attributes['rdf:resource']){
					uri = item.attributes['rdf:resource'].value
				}else if(item.attributes['rdf:about']){
					uri = item.attributes['rdf:about'].value
				}	

				if (uri){
					console.log('making has item')
					let hasItem = this.createElByBestNS('bf:hasItem')
					hasItem.setAttributeNS(this.namespace.rdf, 'rdf:resource', uri)
					instance.appendChild(hasItem)
				}
			}

			// there is only one work, so add it as the instanceOf
			for (let WorkURI in tleLookup['Work']){
				let instanceOf = this.createElByBestNS('bf:instanceOf')
				instanceOf.setAttributeNS(this.namespace.rdf, 'rdf:resource', WorkURI)
				instance.appendChild(instanceOf)
			}



			rdfBasic.appendChild(instance)

		}
		for (let URI in tleLookup['Item']){
			// rdfBasic.appendChild(tleLookup['Item'][URI].cloneNode( true ))

			let item = (new XMLSerializer()).serializeToString(tleLookup['Item'][URI])
			// item = item.replace(/\sxmlns:[a-z]+="http.*?"/g,'')
			item = parser.parseFromString(item, "text/xml").children[0];

			rdfBasic.appendChild(item)

		}

		if (orginalProfile.procInfo.includes("update")){


			
			//build it cenered around the instance
			if (Object.keys(tleLookup['Instance']).length>0){

				for (let URI in tleLookup['Instance']){

					// let instance = tleLookup['Instance'][URI].cloneNode( true )
					let instance = (new XMLSerializer()).serializeToString(tleLookup['Instance'][URI])
					instance = parser.parseFromString(instance, "text/xml").children[0];

					let items = this.returnHasItem(URI,orginalProfile,tleLookup)


					if (items.length > 0){

						

						for (let item of items){
							let p = this.createElByBestNS('bf:hasItem')
							p.appendChild(item)
							instance.appendChild(p)
						}

						


					}
					
					let work = this.returnWorkFromInstance(URI,orginalProfile,tleLookup)

					if (work){
						let p = this.createElByBestNS('bf:instanceOf')

						p.appendChild(work)
						instance.appendChild(p)


					}

					
					

					

					rdf.appendChild(instance)

				}
			}else{


				// no instances...then dont use instanceOf...
				// use the first work key TODO: multiple works....?
				let workKey = Object.keys(tleLookup['Work'])[0]


				let work = tleLookup['Work'][workKey]

				rdf.appendChild(work)




			}
			



		}else{

			// FIX CHANGE NOT RIGHT ECT!!
			for (let URI in tleLookup['Instance']){

			// let instance = tleLookup['Instance'][URI].cloneNode( true )



				let instance = (new XMLSerializer()).serializeToString(tleLookup['Instance'][URI])
				instance = parser.parseFromString(instance, "text/xml").children[0];


				let items = this.returnHasItem(URI,orginalProfile,tleLookup)

				if (items.length > 0){

					

					for (let item of items){
						let p = this.createElByBestNS('bf:hasItem')
						p.appendChild(item)
						instance.appendChild(p)
					}

					


				}



				let work = this.returnWorkFromInstance(URI,orginalProfile,tleLookup)
				
				
				if (work){
					let p = this.createElByBestNS('bf:instanceOf')

					p.appendChild(work)
					instance.appendChild(p)
					// console.log(instance,'instance')

				}

				
				

				

				rdf.appendChild(instance)

			}



		}



		// are we just editing a single HUB?
		if (Object.keys(tleLookup['Work']).length==0 && Object.keys(tleLookup['Hub']).length == 1){
			

			let theHub = (new XMLSerializer()).serializeToString(rdfBasic)
			theHub = parser.parseFromString(theHub, "text/xml").children[0];

			rdf = theHub
		}
		console.log(tleLookup['Work'],Object.keys(tleLookup['Work']).length)
		console.log(tleLookup['Hub'],Object.keys(tleLookup['Hub']).length)

		console.log(rdfBasic)
		console.log(rdf)

		
		
		
	
		if (rdfBasic.getElementsByTagName("bf:mainTitle").length>0){
			xmlVoidDataTitle = rdfBasic.getElementsByTagName("bf:mainTitle")[0].innerHTML

		}else if (rdfBasic.getElementsByTagName("bfsimple:prefTitle").length>0){
			xmlVoidDataTitle = rdfBasic.getElementsByTagName("bfsimple:prefTitle")[0].innerHTML

		}else{
			console.warn('no title found for db')
		}


		if (rdfBasic.getElementsByTagName("bflc:PrimaryContribution").length>0){

			if (rdfBasic.getElementsByTagName("bflc:PrimaryContribution")[0].getElementsByTagName("rdfs:label").length>0){
				xmlVoidDataContributor = rdfBasic.getElementsByTagName("bflc:PrimaryContribution")[0].getElementsByTagName("rdfs:label")[0].innerHTML
			}
			
		}else{

			if (rdfBasic.getElementsByTagName("bf:Contribution").length>0){

				if (rdfBasic.getElementsByTagName("bf:Contribution")[0].getElementsByTagName("rdfs:label").length>0){
					xmlVoidDataContributor = rdfBasic.getElementsByTagName("bf:Contribution")[0].getElementsByTagName("rdfs:label")[0].innerHTML
				}else{
					console.warn('no PrimaryContribution or Contribution found for db')

				}


			}else{

				console.warn('no PrimaryContribution or Contribution found for db')


			}

		}



		if (rdfBasic.getElementsByTagName("bf:Lccn").length>0){
			xmlVoidDataLccn = rdfBasic.getElementsByTagName("bf:Lccn")[0].innerText || rdfBasic.getElementsByTagName("bf:Lccn")[0].textContent
		}else{
			console.warn('no bf:Lccn found for db')
		}


		// create the holder
		let datasetDescriptionEl = document.createElementNS(this.namespace.void,'void:DatasetDescription')

		datasetDescriptionEl.setAttributeNS("http://www.w3.org/2000/xmlns/", `xmlns:void`, this.namespace.void)
		datasetDescriptionEl.setAttributeNS("http://www.w3.org/2000/xmlns/", `xmlns:lclocal`, this.namespace.lclocal)
		let el


		for (let x of xmlVoidDataRtsUsed){
			el = document.createElementNS(this.namespace.lclocal, 'lclocal:rtsused')
			el.innerHTML = x
			datasetDescriptionEl.appendChild(el)
		}

		for (let x of xmlVoidDataType){
			el = document.createElementNS(this.namespace.lclocal, 'lclocal:profiletypes')
			el.innerHTML = x
			datasetDescriptionEl.appendChild(el)
		}


		el = document.createElementNS(this.namespace.lclocal, 'lclocal:title')
		el.innerHTML = xmlVoidDataTitle
		datasetDescriptionEl.appendChild(el)


		el = document.createElementNS(this.namespace.lclocal, 'lclocal:contributor')
		el.innerHTML = xmlVoidDataContributor
		datasetDescriptionEl.appendChild(el)

		el = document.createElementNS(this.namespace.lclocal, 'lclocal:lccn')
		el.innerHTML = xmlVoidDataLccn
		datasetDescriptionEl.appendChild(el)

		el = document.createElementNS(this.namespace.lclocal, 'lclocal:user')
		el.innerHTML = profile.user
		datasetDescriptionEl.appendChild(el)

		el = document.createElementNS(this.namespace.lclocal, 'lclocal:status')
		el.innerHTML = profile.status
		datasetDescriptionEl.appendChild(el)

		el = document.createElementNS(this.namespace.lclocal, 'lclocal:eid')
		el.innerHTML = profile.eId
		datasetDescriptionEl.appendChild(el)

		el = document.createElementNS(this.namespace.lclocal, 'lclocal:typeid')
		el.innerHTML = profile.id
		datasetDescriptionEl.appendChild(el)

		el = document.createElementNS(this.namespace.lclocal, 'lclocal:procinfo')
		el.innerHTML = orginalProfile.procInfo
		datasetDescriptionEl.appendChild(el)


		for (let x of xmlVoidExternalID){
			el = document.createElementNS(this.namespace.lclocal, 'lclocal:externalid')
			el.innerHTML = x
			datasetDescriptionEl.appendChild(el)
		}

		let strXmlFormatted = (new XMLSerializer()).serializeToString(rdf)

		strXmlFormatted = uiUtils.prettifyXmlJS(strXmlFormatted, ' ')



		rdfBasic.appendChild(datasetDescriptionEl)


		let strXmlBasic = (new XMLSerializer()).serializeToString(rdfBasic)
		let strXml = (new XMLSerializer()).serializeToString(rdf)

        /*
            kefo note
            In FF, only strXmlBasic has any real content.  The other two -
            strXml and strXmlFormatted - contain only the root node, rdf:RDF,
            and all the namespaces.
            The below line fixes this in FF for me.
        */
        //strXmlFormatted = uiUtils.prettifyXmlJS(strXmlBasic, ' ')
        //console.log("XML vars")
        //console.log(strXmlFormatted)
        //console.log(strXml)
        //console.log(strXmlBasic)


		
		


		return {
			xmlDom: rdf,
			xmlStringFormatted: strXmlFormatted,
			xlmString: strXml,
			xlmStringBasic: strXmlBasic,
			voidTitle: xmlVoidDataTitle,
			voidContributor:xmlVoidDataContributor
		}





	},


	returnHasItem: function(URI,profile,tleLookup){

		let results = []
		let parser = new DOMParser();

		for (let rt in profile.rt){

			if (profile.rt[rt].itemOf && profile.rt[rt].itemOf == URI){

				console.log("ITEM ALERT")
				console.log(tleLookup['Item'][profile.rt[rt].URI])


				if (tleLookup['Item'][profile.rt[rt].URI].getElementsByTagName('bf:itemOf').length==0){


					let hasItem = this.createElByBestNS('bf:itemOf')
					hasItem.setAttributeNS(this.namespace.rdf, 'rdf:resource', profile.rt[rt].itemOf)
					tleLookup['Item'][profile.rt[rt].URI].appendChild(hasItem)



				}





				let item = (new XMLSerializer()).serializeToString(tleLookup['Item'][profile.rt[rt].URI])
				item = parser.parseFromString(item, "text/xml").children[0];

				results.push(item)

				// results.push(tleLookup['Item'][profile.rt[rt].URI].cloneNode( true ))

			}

		}


		return results

	},
	returnWorkFromInstance: function(instanceURI,profile,tleLookup){
		let parser = new DOMParser();

		let results = null

		for (let rt in profile.rt){

			if (profile.rt[rt].instanceOf && profile.rt[rt].URI == instanceURI){

				results = (new XMLSerializer()).serializeToString(tleLookup['Work'][profile.rt[rt].instanceOf])
				results = parser.parseFromString(results, "text/xml").children[0];


				// results = tleLookup['Work'][profile.rt[rt].instanceOf].cloneNode( true )

			}

		}

		// if that didnt work just pick the first work
		if (!results){
			for (let wUri in tleLookup['Work']){
				results = tleLookup['Work'][wUri]
				break
			}

		}


		return results

	}	





}


export default exportXML;