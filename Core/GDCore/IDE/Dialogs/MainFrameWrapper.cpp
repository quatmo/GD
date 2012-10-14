/** \file
 *  Game Develop
 *  2008-2012 Florian Rival (Florian.Rival@gmail.com)
 */
#include "MainFrameWrapper.h"
#include <wx/aui/aui.h>

void gd::MainFrameWrapper::DisableControlsForScenePreviewing()
{
    unsigned int notebookCurrentPage =  editorsNotebook ? editorsNotebook->GetSelection() : 0;
    for (unsigned int i = 0;i<disableOnPreview.size();++i) disableOnPreview[i]->Disable();
    if ( editorsNotebook ) editorsNotebook->SetSelection(notebookCurrentPage);
};

/**
 * Remove a control to the list of controls to be disabled on preview
 */
void gd::MainFrameWrapper::RemoveControlToBeDisabledOnPreview(wxWindow * control)
{
    for (unsigned int i = 0;i<disableOnPreview.size();++i)
    {
        if ( disableOnPreview[i] == control )
        {
            disableOnPreview.erase(disableOnPreview.begin()+i);
            return;
        }
    }
}

