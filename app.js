function App(settings){
	var self = this;
	var client = self.client = new Client(settings);
	var rootFile = ".ynabSettings.yroot";
	var appSettings = { client: client, app: self };
	self.budget = new Budget(appSettings);
	self.account = new Account(appSettings);
	self.payee = new Payee(appSettings)
	self.categories = new Category(appSettings);
	self.transaction = new Transaction(appSettings)

	client.authenticate().then(function(){
	  client.loadJson(rootFile).then(function(root){
	    self.budget.budgets(root.relativeKnownBudgets);
	    if(self.budget.budgets().length === 1){
	    	self.budget.select(self.budget.budgets()[0])
	    }
	  });
	});

	client.dropbox.onError.addListener(function(error) {
	    console.error(error);
	});

	function path(){
		return Array.prototype.slice.call(arguments, 0).join("/")
	}
}

function Account(settings){
	var self = this;

	self.accounts = ko.observableArray();
	self.selectedAccount = ko.observable()

	var lookup = ko.computed(function(){
		return _.indexBy(self.accounts(), 'entityId')
	})

	self.lookup = function(id) {
		return lookup()[id] || {};
	}

	self.budgetAccounts = ko.computed(function(){
		return _.filter(self.accounts(), function(account){
			return account.onBudget;
		});
	})

	self.offBudgetAccounts = ko.computed(function(){
		return _.difference(self.accounts(), self.budgetAccounts());
	})

	self.select = function(account){
		self.selectedAccount(account)
	}
}

function Payee(settings){
	var self = this;
	self.payees = ko.observableArray();

	var lookup = ko.computed(function(){
		return _.indexBy(self.payees(), 'entityId')
	})

	self.lookup = function(id) {
		return lookup()[id] || {};
	}
}

function Category(settings) {
	var self = this;
	self.categories = ko.observableArray();

	var lookup = ko.computed(function(){
		return _.indexBy(self.categories(), 'entityId')
	})

	self.lookup = function(id) {
		return lookup()[id] || {};
	}
}

function MonthlyBudget(settings){
	var self = this;
	self.monthlyBudgets = ko.observableArray();
}

function Transaction(settings){
	var self = this;
	self.transactions = ko.observableArray();

	self.filteredTransactions = ko.computed(function(){
		var account = settings.app.account.selectedAccount();
		if(account){
			return self.transactions().filter(function(transaction){
				return transaction.accountId === account.entityId;
			})
		}else{
			return self.transactions();
		}
	})
}

function Budget(settings){
	var self = this;
	var budgetMetaFile = "Budget.ymeta";
	var client = settings.client;
	var app = settings.app;

	self.budgets = ko.observableArray();
	self.budget = ko.observable();
	self.budgetDataFolder = ko.observable()
	self.device = ko.observable();

	self.budgetName = ko.computed(function(){
		return ((self.budget() || "").split("/")[1] || "").split("~")[0];
	})

	self.budgetMetaPath = ko.computed(function(){
		return [self.budget(), budgetMetaFile].join("/")
	})
	self.budgetDataPath = ko.computed(function(){
		return [self.budget(), self.budgetDataFolder()].join("/")
	})
	self.budgetDevicesPath = ko.computed(function(){
		return [self.budgetDataPath(), "devices"].join("/")
	})
	self.deviceFilePath = function(deviceFileName){
		return [self.budgetDevicesPath(), deviceFileName].join("/")
	}
	self.fullBudgetPath = ko.computed(function(){
		if(self.device()){
			return [self.budgetDataPath(), self.device().deviceGUID].join("/");
		}
	})
	self.fullBudgetSettings = ko.computed(function(){
		return [self.fullBudgetPath(), "budgetSettings.ybsettings"].join("/");
	})
	self.fullBudgetFile = ko.computed(function(){
		return [self.fullBudgetPath(), "Budget.yfull"].join("/");
	})

	self.select = function(budget){
		self.budget(budget);
		self.device(null);

		client.loadJson(self.budgetMetaPath()).then(function(data){
			self.budgetDataFolder(data.relativeDataFolderName);
			client.readDir(self.budgetDataPath()).then(function(){
				client.readDir(self.budgetDevicesPath()).then(function(deviceFiles){
					async.eachLimit(deviceFiles, 1, function(deviceFile, callback){
						if(self.device()) {
							callback()
						}else{
							client.loadJson(self.deviceFilePath(deviceFile)).then(function(device){
								if(device.hasFullKnowledge){
									self.device(device);
								}
								callback();
							})
						}
					}, function(err){
						client.loadJson(self.fullBudgetFile()).then(function(budget){
							console.log(Object.keys(budget))
							var categories = _.chain(budget.masterCategories).map(function(masterCategories){
								return masterCategories.subCategories;
							}).flatten().filter(function(c) { return c; }).value();

							console.log(categories)

							app.account.accounts(budget.accounts)
							app.transaction.transactions(budget.transactions)
							app.payee.payees(budget.payees)
						})
					})
				})
			})
		})
	}
}