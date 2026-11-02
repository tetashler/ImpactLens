# Retained review attempt capacity

The local `storage-admission-v1` namespace now admits at most 32 attempts. Existing slots 00–15 keep their claims, bindings, and initialization records; new attempts can use slots 16–31. The claim format and policy identifier remain unchanged, so retained records require no migration, deletion, or rewriting.

Claims remain consumed permanently, including attempts that stopped before a run was bound. Duplicate attempts and crossed bindings are still rejected. A full 32-slot namespace stops Explore before provider dispatch.

This change does not increase a run's 50-agent limit, 30-call limit, or inference budget. Namespace inspection still enforces 256 files, 3 GiB, eight directories, and depth three. Those independent limits can stop admission before all 32 slots are occupied.

Offline regression coverage seeds 16 original-format claims and seven bindings, admits the next 16 attempts, and verifies that every original claim and binding retains its exact bytes. Focused storage tests also cover saturation before dispatch and concurrent competition for the final slot. All tests write only temporary fixture namespaces.
