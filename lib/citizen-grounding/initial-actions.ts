/** New-policy placement only. The immutable accepted source remains in genesis.input.acceptedActions. */
export function scenarioRoleQuotation(source:string):string{
 const prefix='Accepted scenario-role quotation (analytical role, not this citizen\'s biography): "',suffix='"',omitted=' [source excerpt; remainder omitted]';
 const available=1000-prefix.length-suffix.length;
 return prefix+(source.length<=available?source:source.slice(0,available-omitted.length)+omitted)+suffix;
}
