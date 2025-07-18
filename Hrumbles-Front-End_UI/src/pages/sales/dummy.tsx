<div className="border rounded-lg overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading && <tr><td colSpan={5} className="text-center p-4">Loading...</td></tr>}
            {isError && <tr><td colSpan={5} className="text-center p-4 text-red-500">Error loading data.</td></tr>}
            {!isLoading && paginatedCompanies.length === 0 && (
              <tr><td colSpan={5} className="text-center p-4 text-gray-500">No companies found.</td></tr>
            )}
            {paginatedCompanies.map((company) => (
              <tr key={company.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <Avatar><AvatarImage src={company.logo_url || undefined} /><AvatarFallback>{company.name?.charAt(0)}</AvatarFallback></Avatar>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 hover:text-primary"><Link to={`/companies/${company.id}`}>{company.name}</Link></div>
                      <div className="text-xs text-gray-500">{getDisplayValue(company.industry, 'No Industry')}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className={`h-7 px-2 text-xs w-full max-w-[150px] justify-between truncate border ${stageColors[getDisplayValue(company.stage, 'default')] ?? stageColors['default']}`} disabled={updateStageMutation.isPending && updateStageMutation.variables?.companyId === company.id}>
                        <span className="truncate">{getDisplayValue(company.stage, 'Select Stage')}</span><ChevronDown className="h-3 w-3 ml-1 flex-shrink-0" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {STAGES.map(stage => <DropdownMenuItem key={stage} onSelect={() => handleStageChange(company.id, stage)}>{stage}</DropdownMenuItem>)}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
               <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {company.created_by_employee ? (
                    <button
                      onClick={() => handleCreatorClick(company.created_by)}
                      className="text-left hover:text-primary hover:underline focus:outline-none"
                      title={`Filter by ${company.created_by_employee.first_name}`}
                    >
                      {`${company.created_by_employee.first_name} ${company.created_by_employee.last_name}`}
                    </button>
                  ) : (
                    <span>System</span>
                  )}
                  <div className="text-xs">{moment(company.created_at).format("DD MMM YYYY")}</div>
                </td>

                {/* === MODIFIED "Last Updated" CELL === */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {company.updated_by_employee ? (
                    <button
                      onClick={() => handleCreatorClick(company.updated_by)}
                      className="text-left hover:text-primary hover:underline focus:outline-none"
                      title={`Filter by ${company.updated_by_employee.first_name}`}
                    >
                      {`${company.updated_by_employee.first_name} ${company.updated_by_employee.last_name}`}
                    </button>
                  ) : (
                    <span>N/A</span>
                  )}
                  <div className="text-xs">{moment(company.updated_at).fromNow()}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Button variant="ghost" size="icon" onClick={() => handleEditClick(company as CompanyDetail)}><Edit className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>