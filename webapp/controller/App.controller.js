sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/MessageToast", //step 2 In this step, we add features to filter, sort, and count the user data by using the OData V4 model API to apply OData system query options $filter , $orderby , and $count 
	"sap/m/MessageBox", // step 2 Sorter, Filter, FilterOperator, FilterType, 	 
	"sap/ui/model/Sorter",//step 4 In this step, we add features to filter, sort, and count the user data by using the OData V4 model API to apply OData system query options $filter , $orderby , and $count .
	"sap/ui/model/Filter",//step 4
	"sap/ui/model/FilterOperator",//step 4
	"sap/ui/model/FilterType", //step 4	
	"sap/ui/model/json/JSONModel"
	
//step 5 In this step, we have a closer look at batch groups. Batch groups are used to group multiple requests into one server request to improve the overall performance. 
//I have just added  webapp/manifest.json the line code "groupId": "$auto", (the old value was $direct)
], function (Controller, MessageToast, MessageBox, Sorter, Filter, FilterOperator, FilterType, JSONModel) {
	"use strict";

	return Controller.extend("sap.ui.core.tutorial.odatav4.controller.App", {

		/**
		 *  Hook for initializing the controller
		 */
		onInit : function () {
/*			var oJSONData = {
				busy : false,
				order : 0 //step 4
			};
			var oModel = new JSONModel(oJSONData);
			this.getView().setModel(oModel, "appView");*/
			// Step 6: Create and Edit, In this step, we will make it possible to create and edit (update) user data from the user interface and send the data to the back end.
			var oMessageManager = sap.ui.getCore().getMessageManager(),
				oMessageModel = oMessageManager.getMessageModel(),
				oMessageModelBinding = oMessageModel.bindList("/", undefined, [],
					new Filter("technical", FilterOperator.EQ, true)),
				oViewModel = new JSONModel({
					busy : false,
					hasUIChanges : false,
					usernameEmpty : true,
					order : 0
				});
			this.getView().setModel(oViewModel, "appView");
			this.getView().setModel(oMessageModel, "message");

			oMessageModelBinding.attachChange(this.onMessageBindingChange, this);
			this._bTechnicalErrors = false;			
			
		}, //step6 inicio
		onCreate : function () {
			var oList = this.byId("peopleList"),
				oBinding = oList.getBinding("items"),
				oContext = oBinding.create({
					"UserName" : "",
					"FirstName" : "",
					"LastName" : "",
					"Age" : "18"
				});

			oContext.created().then(function () {
				oBinding.refresh();
			});//step 6 fim

			this._setUIChanges();
			this.getView().getModel("appView").setProperty("/usernameEmpty", true);

			oList.getItems().some(function (oItem) {
				if (oItem.getBindingContext() === oContext) {
					oItem.focus();
					oItem.setSelected(true);
					return true;
				}
			});
		},
		onInputChange : function (oEvt) {
			if (oEvt.getParameter("escPressed")) {
				this._setUIChanges();
			} else {
				this._setUIChanges(true);
				if (oEvt.getSource().getParent().getBindingContext().getProperty("UserName")) {
					this.getView().getModel("appView").setProperty("/usernameEmpty", false);
				}
			}
		},
		//step 6 fim		
		//step 7 inicio In this step, we make it possible to delete user data.
		onDelete : function () {
			var oSelected = this.byId("peopleList").getSelectedItem();

			if (oSelected) {
				oSelected.getBindingContext().delete("$auto").then(function () {
					MessageToast.show(this._getText("deletionSuccessMessage"));
				}.bind(this), function (oError) {
					MessageBox.error(oError.message);
				});
			}
		},
		//step 7 fim
		// Step 2: Data Access and Client-Server Communication
		onRefresh : function () {
			var oBinding = this.byId("peopleList").getBinding("items");

			if (oBinding.hasPendingChanges()) {
				MessageBox.error(this._getText("refreshNotPossibleMessage"));
				return;
			}
			oBinding.refresh();
			MessageToast.show(this._getText("refreshSuccessMessage"));
		},// step 4 inity
		//step 6 create and edit inicio
		onResetChanges : function () {
			this.byId("peopleList").getBinding("items").resetChanges();
			this._bTechnicalErrors = false; 
			this._setUIChanges();
		},//fim step 8 Our OData service provides one OData operation: the ResetDataSource action. In this step, we add a button that resets all data changes we made during the tutorial to their original state using this action.		
		onResetDataSource : function () {
			var oModel = this.getView().getModel(),
				oOperation = oModel.bindContext("/ResetDataSource(...)");

			oOperation.execute().then(function () {
					oModel.refresh();
					MessageToast.show(this._getText("sourceResetSuccessMessage"));
				}.bind(this), function (oError) {
					MessageBox.error(oError.message);
				}
			);
		},//fim step 8
		onSave : function () {
					var fnSuccess = function () {
						this._setBusy(false);
						MessageToast.show(this._getText("changesSentMessage"));
						this._setUIChanges(false);
					}.bind(this);
		
					var fnError = function (oError) {
						this._setBusy(false);
						this._setUIChanges(false);
						MessageBox.error(oError.message);
					}.bind(this);
		
					this._setBusy(true); // Lock UI until submitBatch is resolved.
					this.getView().getModel().submitBatch("peopleGroup").then(fnSuccess, fnError);
					this._bTechnicalErrors = false; // If there were technical errors, a new save resets them.
				},		//step 6 create and edit fim
		
		
		onSearch : function () {
			var oView = this.getView(),
				sValue = oView.byId("searchField").getValue(),
				oFilter = new Filter("LastName", FilterOperator.Contains, sValue);

			oView.byId("peopleList").getBinding("items").filter(oFilter, FilterType.Application);
		},

		onSort : function () {
			var oView = this.getView(),
				aStates = [undefined, "asc", "desc"],
				aStateTextIds = ["sortNone", "sortAscending", "sortDescending"],
				sMessage,
				iOrder = oView.getModel("appView").getProperty("/order");

			iOrder = (iOrder + 1) % aStates.length;
			var sOrder = aStates[iOrder];

			oView.getModel("appView").setProperty("/order", iOrder);
			oView.byId("peopleList").getBinding("items").sort(sOrder && new Sorter("LastName", sOrder === "desc"));

			sMessage = this._getText("sortMessage", [this._getText(aStateTextIds[iOrder])]);
			MessageToast.show(sMessage);
		}, //fim step 4
		_getText : function (sTextId, aArgs) {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sTextId, aArgs);

		},
		//step 6 inicio
		onMessageBindingChange : function (oEvent) {
			var aContexts = oEvent.getSource().getContexts(),
				aMessages,
				bMessageOpen = false;

			if (bMessageOpen || !aContexts.length) {
				return;
			}

			// Extract and remove the technical messages
			aMessages = aContexts.map(function (oContext) {
				return oContext.getObject();
			});
			sap.ui.getCore().getMessageManager().removeMessages(aMessages);

			this._setUIChanges(true);
			this._bTechnicalErrors = true;
			MessageBox.error(aMessages[0].message, {
				id : "serviceErrorMessageBox",
				onClose : function () {
					bMessageOpen = false;
				}
			});

			bMessageOpen = true;
		},
		
		_setUIChanges : function (bHasUIChanges) {
			if (this._bTechnicalErrors) {
				// If there is currently a technical error, then force 'true'.
				bHasUIChanges = true;
			} else if (bHasUIChanges === undefined) {
				bHasUIChanges = this.getView().getModel().hasPendingChanges();
			}
			var oModel = this.getView().getModel("appView");
			oModel.setProperty("/hasUIChanges", bHasUIChanges);
		},
		_setBusy : function (bIsBusy) {
			var oModel = this.getView().getModel("appView");
			oModel.setProperty("/busy", bIsBusy);
		}		
		//step 6 fim	
	});
});